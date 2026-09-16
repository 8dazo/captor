import type { EstimateResult, PricingEntry } from '@captar/types';
import { roundUsd } from '@captar/utils';

import { BudgetExceededError, PolicyViolationError } from './errors.js';
import type { PricingRegistry } from './pricing-registry.js';

type OpenAIRequest = Record<string, unknown>;

export type OutputTokenField = 'max_output_tokens' | 'max_completion_tokens' | 'max_tokens';

export interface BudgetPlanOptions {
  remainingUsd: number;
  protectedReserveUsd?: number;
  policyMaxOutputTokens?: number;
  outputField: OutputTokenField;
}

export interface BudgetPlan {
  request: OpenAIRequest;
  estimate: EstimateResult;
  enforcedOutputTokens?: number;
  spendableUsd: number;
}

function utf8ByteLength(value: unknown): number {
  const serialized = typeof value === 'string' ? value : JSON.stringify(value ?? '');
  return new TextEncoder().encode(serialized).length;
}

function conservativeInputTokens(request: OpenAIRequest): number {
  // For hard-budget planning we intentionally use serialized UTF-8 bytes as a
  // conservative token upper bound instead of the looser chars/4 telemetry
  // estimate. The JSON representation also includes message structure, which
  // gives us additional headroom for provider-side chat formatting overhead.
  return Math.max(1, utf8ByteLength(request.input ?? request.messages ?? ''));
}

function requestOutputLimit(
  request: OpenAIRequest,
  outputField: OutputTokenField,
): number | undefined {
  if (outputField === 'max_output_tokens') {
    return typeof request.max_output_tokens === 'number' ? request.max_output_tokens : undefined;
  }

  if (outputField === 'max_completion_tokens') {
    if (typeof request.max_completion_tokens === 'number') return request.max_completion_tokens;
    if (typeof request.max_tokens === 'number') return request.max_tokens;
    return undefined;
  }

  if (typeof request.max_tokens === 'number') return request.max_tokens;
  if (typeof request.max_completion_tokens === 'number') return request.max_completion_tokens;
  return undefined;
}

function minDefined(values: Array<number | undefined>): number | undefined {
  const finite = values.filter(
    (value): value is number => typeof value === 'number' && Number.isFinite(value),
  );
  return finite.length > 0 ? Math.min(...finite) : undefined;
}

function calculateCost(
  pricing: PricingEntry,
  inputTokens: number,
  outputTokens: number,
): number {
  return roundUsd(
    (inputTokens / 1000) * pricing.inputCostPer1kTokensUsd +
      (outputTokens / 1000) * pricing.outputCostPer1kTokensUsd,
  );
}

function applyOutputLimit(
  request: OpenAIRequest,
  outputField: OutputTokenField,
  outputTokens: number,
): OpenAIRequest {
  const plannedRequest: OpenAIRequest = {
    ...request,
    [outputField]: outputTokens,
  };

  if (outputField === 'max_completion_tokens') {
    delete plannedRequest.max_tokens;
  } else if (outputField === 'max_tokens') {
    delete plannedRequest.max_completion_tokens;
  }

  return plannedRequest;
}

export class BudgetPlanner {
  constructor(
    private readonly registry: PricingRegistry,
    private readonly provider: string,
  ) {}

  plan(request: OpenAIRequest, options: BudgetPlanOptions): BudgetPlan {
    const model = typeof request.model === 'string' ? request.model : 'unknown';
    const pricing = this.registry.get(this.provider, model);
    if (!pricing) {
      throw new PolicyViolationError(
        `No pricing configured for provider "${this.provider}" model "${model}". Add an explicit pricing entry or override before executing this request.`,
      );
    }

    const inputTokens = conservativeInputTokens(request);
    const requestedOutputTokens = requestOutputLimit(request, options.outputField);
    const finiteBudget = Number.isFinite(options.remainingUsd);
    const protectedReserveUsd = Math.max(0, options.protectedReserveUsd ?? 0);
    const spendableUsd = finiteBudget
      ? Math.max(0, roundUsd(options.remainingUsd - protectedReserveUsd))
      : Number.POSITIVE_INFINITY;

    const inputCostUsd = roundUsd(
      (inputTokens / 1000) * pricing.inputCostPer1kTokensUsd,
    );

    if (finiteBudget && inputCostUsd > spendableUsd) {
      throw new BudgetExceededError(
        `Estimated input cost $${inputCostUsd.toFixed(6)} exceeds the spendable session budget $${spendableUsd.toFixed(6)}.`,
      );
    }

    const outputUsdPerToken = pricing.outputCostPer1kTokensUsd / 1000;
    let affordableOutputTokens: number | undefined;

    if (finiteBudget && outputUsdPerToken > 0) {
      const outputBudgetUsd = Math.max(0, spendableUsd - inputCostUsd);
      affordableOutputTokens = Math.floor((outputBudgetUsd + 1e-12) / outputUsdPerToken);
      if (affordableOutputTokens < 1) {
        throw new BudgetExceededError(
          `No output token fits within the remaining spendable budget $${spendableUsd.toFixed(6)}.`,
        );
      }
    }

    const enforcedOutputTokens = minDefined([
      requestedOutputTokens,
      options.policyMaxOutputTokens,
      affordableOutputTokens,
    ]);

    if (typeof enforcedOutputTokens === 'number' && enforcedOutputTokens < 1) {
      throw new BudgetExceededError('The effective output-token limit must be at least 1.');
    }

    const plannedOutputTokens = enforcedOutputTokens ?? requestedOutputTokens ?? 256;
    const estimatedCostUsd = calculateCost(pricing, inputTokens, plannedOutputTokens);

    if (finiteBudget && estimatedCostUsd > spendableUsd) {
      throw new BudgetExceededError(
        `Planned request cost $${estimatedCostUsd.toFixed(6)} exceeds the spendable session budget $${spendableUsd.toFixed(6)}.`,
      );
    }

    const plannedRequest =
      typeof enforcedOutputTokens === 'number'
        ? applyOutputLimit(request, options.outputField, enforcedOutputTokens)
        : { ...request };

    return {
      request: plannedRequest,
      estimate: {
        provider: this.provider,
        model,
        estimatedInputTokens: inputTokens,
        estimatedOutputTokens: plannedOutputTokens,
        estimatedCostUsd,
      },
      enforcedOutputTokens,
      spendableUsd,
    };
  }
}
