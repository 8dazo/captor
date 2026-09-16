import type { EstimateResult } from '@captar/types';

import { BudgetExceededError, PolicyViolationError } from './errors.js';
import {
  assertLocallyPriceableServiceTier,
  calculatePricingCost,
} from './pricing-calculator.js';
import {
  estimateProviderCharges,
  type ProviderChargeEstimate,
} from './provider-charges.js';
import type { PricingRegistry } from './pricing-registry.js';

type OpenAIRequest = Record<string, unknown>;

export type OutputTokenField = 'max_output_tokens' | 'max_completion_tokens' | 'max_tokens';

export interface BudgetPlanOptions {
  remainingUsd: number;
  protectedReserveUsd?: number;
  policyMaxOutputTokens?: number;
  outputField: OutputTokenField;
}

export type VersionedEstimateResult = EstimateResult & {
  pricingVersion: string;
  pricingSource: string;
  pricingConservative: boolean;
  longContextMultiplierApplied: boolean;
};

export interface BudgetPlan {
  request: OpenAIRequest;
  estimate: VersionedEstimateResult;
  enforcedOutputTokens?: number;
  spendableUsd: number;
  providerCharges: ProviderChargeEstimate;
}

const BILLABLE_CONTEXT_FIELDS = [
  'instructions',
  'tools',
  'functions',
  'response_format',
  'text',
] as const;

function utf8ByteLength(value: unknown): number {
  const serialized = typeof value === 'string' ? value : JSON.stringify(value ?? '');
  return new TextEncoder().encode(serialized).length;
}

function conservativeInputTokens(request: OpenAIRequest): number {
  const primary = request.input ?? request.messages ?? '';
  const additionalContext: Record<string, unknown> = {};

  for (const field of BILLABLE_CONTEXT_FIELDS) {
    const value = request[field];
    if (value !== undefined && value !== null) {
      additionalContext[field] = value;
    }
  }

  if (Object.keys(additionalContext).length === 0) {
    return Math.max(1, utf8ByteLength(primary));
  }

  return Math.max(
    1,
    utf8ByteLength({
      prompt: primary,
      ...additionalContext,
    }),
  );
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

function assertHardBudgetProviderCharges(
  providerCharges: ProviderChargeEstimate,
  spendableUsd: number,
): void {
  if (providerCharges.missingPricing.length > 0) {
    throw new PolicyViolationError(
      `No provider-hosted tool pricing configured for: ${providerCharges.missingPricing.join(', ')}. Add providerToolCostsUsd entries before using these tools under a hard USD budget.`,
    );
  }

  if (providerCharges.requiresToolCallCeiling) {
    throw new PolicyViolationError(
      'A positive provider-hosted tool price requires request.max_tool_calls under a hard USD budget so Captar can reserve a finite maximum charge.',
    );
  }

  if (providerCharges.estimatedCostUsd > spendableUsd) {
    throw new BudgetExceededError(
      `Provider-hosted tool reservation $${providerCharges.estimatedCostUsd.toFixed(8)} exceeds the spendable session budget $${spendableUsd.toFixed(8)}.`,
    );
  }
}

export class BudgetPlanner {
  constructor(
    private readonly registry: PricingRegistry,
    private readonly provider: string,
  ) {}

  plan(request: OpenAIRequest, options: BudgetPlanOptions): BudgetPlan {
    const model = typeof request.model === 'string' ? request.model : 'unknown';
    const pricing = this.registry.resolve(this.provider, model);
    if (!pricing) {
      throw new PolicyViolationError(
        `No pricing configured for provider "${this.provider}" model "${model}". Add an explicit pricing entry or override before executing this request.`,
      );
    }
    assertLocallyPriceableServiceTier(request, pricing);

    const inputTokens = conservativeInputTokens(request);
    const requestedOutputTokens = requestOutputLimit(request, options.outputField);
    const finiteBudget = Number.isFinite(options.remainingUsd);
    const protectedReserveUsd = Math.max(0, options.protectedReserveUsd ?? 0);
    const spendableUsd = finiteBudget
      ? Math.max(0, options.remainingUsd - protectedReserveUsd)
      : Number.POSITIVE_INFINITY;
    const providerCharges = estimateProviderCharges(request);

    if (finiteBudget) {
      assertHardBudgetProviderCharges(providerCharges, spendableUsd);
    }

    const tokenSpendableUsd = finiteBudget
      ? Math.max(0, spendableUsd - providerCharges.estimatedCostUsd)
      : Number.POSITIVE_INFINITY;
    const inputCalculation = calculatePricingCost(
      pricing,
      { inputTokens, outputTokens: 0 },
      { conservativeUnknownCacheWrites: true },
    );
    const inputCostUsd = inputCalculation.costUsd;

    if (finiteBudget && inputCostUsd > tokenSpendableUsd) {
      throw new BudgetExceededError(
        `Estimated input cost $${inputCostUsd.toFixed(8)} plus provider-hosted charges $${providerCharges.estimatedCostUsd.toFixed(8)} exceeds the spendable session budget $${spendableUsd.toFixed(8)}.`,
      );
    }

    const outputMultiplier = inputCalculation.longContextMultiplierApplied
      ? pricing.rule?.longContextOutputMultiplier ?? 1
      : 1;
    const outputUsdPerToken =
      (pricing.entry.outputCostPer1kTokensUsd / 1000) * outputMultiplier;
    let affordableOutputTokens: number | undefined;

    if (finiteBudget && outputUsdPerToken > 0) {
      const outputBudgetUsd = Math.max(0, tokenSpendableUsd - inputCostUsd);
      affordableOutputTokens = Math.floor((outputBudgetUsd + Number.EPSILON) / outputUsdPerToken);
      if (affordableOutputTokens < 1) {
        throw new BudgetExceededError(
          `No output token fits within the remaining spendable budget $${spendableUsd.toFixed(8)} after reserving provider-hosted charges.`,
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
    const tokenCalculation = calculatePricingCost(
      pricing,
      {
        inputTokens,
        outputTokens: plannedOutputTokens,
      },
      { conservativeUnknownCacheWrites: true },
    );
    const estimatedCostUsd = tokenCalculation.costUsd + providerCharges.estimatedCostUsd;

    if (finiteBudget && estimatedCostUsd > spendableUsd) {
      throw new BudgetExceededError(
        `Planned request cost $${estimatedCostUsd.toFixed(8)} exceeds the spendable session budget $${spendableUsd.toFixed(8)}.`,
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
        pricingVersion: pricing.pricingVersion,
        pricingSource: pricing.pricingSource,
        pricingConservative: tokenCalculation.conservative,
        longContextMultiplierApplied: tokenCalculation.longContextMultiplierApplied,
      },
      enforcedOutputTokens,
      spendableUsd,
      providerCharges,
    };
  }
}
