import type {
  EstimateResult,
  PricingEntry,
  ProviderAdapter,
  UsageRecord,
} from '@captar/types';
import { estimateTokensFromText } from '@captar/utils';

import { PolicyViolationError } from './errors.js';
import {
  estimateProviderCharges,
  stripProviderChargeContext,
} from './provider-charges.js';
import type { PricingRegistry } from './pricing-registry.js';

type OpenAIRequest = Record<string, unknown>;
type OpenAIResponse = Record<string, unknown>;

function usageNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? value
    : undefined;
}

function objectRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function cachedTokensFromUsage(
  usage: Record<string, unknown>,
  inputTokens: number | undefined,
): number | undefined {
  const direct = usageNumber(usage.cached_input_tokens);
  const inputDetails = objectRecord(usage.input_tokens_details);
  const promptDetails = objectRecord(usage.prompt_tokens_details);
  const nested =
    usageNumber(inputDetails?.cached_tokens) ??
    usageNumber(promptDetails?.cached_tokens);
  const cached = direct ?? nested;

  if (typeof cached !== 'number') {
    return undefined;
  }

  return typeof inputTokens === 'number' ? Math.min(inputTokens, cached) : cached;
}

function streamUsageSnapshot(
  defaultModel: string,
  chunks: Array<Record<string, unknown>>,
): { model: string; usage?: Record<string, unknown> } {
  let model = defaultModel;
  let usage: Record<string, unknown> | undefined;

  for (const chunk of chunks) {
    if (typeof chunk.model === 'string') {
      model = chunk.model;
    }

    const topLevelUsage = objectRecord(chunk.usage);
    if (topLevelUsage) {
      usage = topLevelUsage;
    }

    const response = objectRecord(chunk.response);
    if (response) {
      if (typeof response.model === 'string') {
        model = response.model;
      }
      const responseUsage = objectRecord(response.usage);
      if (responseUsage) {
        usage = responseUsage;
      }
    }
  }

  return { model, usage };
}

export class OpenAIAdapter implements ProviderAdapter<OpenAIRequest, OpenAIResponse> {
  readonly provider: string;
  private estimatedModel?: string;
  private estimatedProviderChargesUsd = 0;

  constructor(
    private readonly registry: PricingRegistry,
    private readonly executeRequest: (request: OpenAIRequest) => Promise<OpenAIResponse>,
    provider = 'openai',
  ) {
    this.provider = provider;
  }

  async estimate(request: OpenAIRequest): Promise<EstimateResult> {
    const model = typeof request.model === 'string' ? request.model : 'unknown';
    this.estimatedModel = model;
    const pricing = this.requirePricing(model);
    const estimatedInputTokens = estimateTokensFromText(request.input ?? request.messages);
    const estimatedOutputTokens = this.resolveOutputTokens(request);
    const providerCharges = estimateProviderCharges(request);
    const estimatedCostUsd =
      this.calculateCost(pricing, {
        inputTokens: estimatedInputTokens,
        outputTokens: estimatedOutputTokens,
        cachedInputTokens: 0,
      }) + providerCharges.estimatedCostUsd;

    return {
      provider: this.provider,
      model,
      estimatedInputTokens,
      estimatedOutputTokens,
      estimatedCostUsd,
    };
  }

  async execute(request: OpenAIRequest): Promise<OpenAIResponse> {
    const model =
      typeof request.model === 'string'
        ? request.model
        : this.estimatedModel ?? 'unknown';
    this.estimatedModel = model;
    this.requirePricing(model);
    this.estimatedProviderChargesUsd = estimateProviderCharges(request).estimatedCostUsd;
    return await this.executeRequest(stripProviderChargeContext(request));
  }

  extractUsage(response: OpenAIResponse, estimatedCostUsd = 0): UsageRecord {
    const model =
      typeof response.model === 'string'
        ? response.model
        : this.estimatedModel ?? 'unknown';
    const pricing = this.requirePricing(model);
    const usage = objectRecord(response.usage) ?? {};
    const inputTokens = usageNumber(usage.input_tokens) ?? usageNumber(usage.prompt_tokens);
    const outputTokens = usageNumber(usage.output_tokens) ?? usageNumber(usage.completion_tokens);
    const cachedInputTokens = cachedTokensFromUsage(usage, inputTokens);
    const usageProvided =
      typeof inputTokens === 'number' ||
      typeof outputTokens === 'number' ||
      typeof cachedInputTokens === 'number';
    const providerCost = usageNumber(usage.cost);
    const providerHostedChargeEstimateUsd = this.estimatedProviderChargesUsd;

    let costUsd: number;
    let costSource: UsageRecord['costSource'];
    let costConfidence: UsageRecord['costConfidence'];

    if (typeof providerCost === 'number') {
      costUsd = providerCost;
      costSource = 'provider';
      costConfidence = 'authoritative';
    } else if (usageProvided) {
      costUsd =
        this.calculateCost(pricing, {
          inputTokens,
          outputTokens,
          cachedInputTokens,
        }) + providerHostedChargeEstimateUsd;
      if (providerHostedChargeEstimateUsd > 0) {
        costSource = 'conservative_estimate';
        costConfidence = 'upper_bound';
      } else {
        costSource = 'local_calculation';
        costConfidence = 'calculated';
      }
    } else {
      costUsd = estimatedCostUsd;
      costSource = 'conservative_estimate';
      costConfidence = 'upper_bound';
    }

    return {
      provider: this.provider,
      model,
      inputTokens,
      outputTokens,
      cachedInputTokens,
      estimatedCostUsd,
      costUsd,
      costSource,
      costConfidence,
      ...(providerHostedChargeEstimateUsd > 0
        ? { providerHostedChargeEstimateUsd }
        : {}),
    };
  }

  extractStreamUsage(
    model: string,
    chunks: Array<Record<string, unknown>>,
    estimatedCostUsd = 0,
  ): UsageRecord {
    const snapshot = streamUsageSnapshot(model, chunks);
    return this.extractUsage(
      {
        model: snapshot.model,
        ...(snapshot.usage ? { usage: snapshot.usage } : {}),
      },
      estimatedCostUsd,
    );
  }

  private resolveOutputTokens(request: OpenAIRequest): number {
    const value =
      request.max_output_tokens ?? request.max_completion_tokens ?? request.max_tokens;
    return typeof value === 'number' ? value : 256;
  }

  private calculateCost(
    pricing: PricingEntry,
    usage: {
      inputTokens?: number;
      outputTokens?: number;
      cachedInputTokens?: number;
    },
  ): number {
    const inputTokens = Math.max(0, usage.inputTokens ?? 0);
    const cachedInputTokens = Math.min(
      inputTokens,
      Math.max(0, usage.cachedInputTokens ?? 0),
    );
    const uncachedInputTokens = Math.max(0, inputTokens - cachedInputTokens);
    const cachedInputRate =
      pricing.cachedInputCostPer1kTokensUsd ?? pricing.inputCostPer1kTokensUsd;

    return (
      (uncachedInputTokens / 1000) * pricing.inputCostPer1kTokensUsd +
      (cachedInputTokens / 1000) * cachedInputRate +
      ((usage.outputTokens ?? 0) / 1000) * pricing.outputCostPer1kTokensUsd
    );
  }

  private requirePricing(model: string): PricingEntry {
    const pricing = this.registry.get(this.provider, model);
    if (!pricing) {
      throw new PolicyViolationError(
        `No pricing configured for provider "${this.provider}" model "${model}". Add an explicit pricing entry or override before executing this request.`,
      );
    }
    return pricing;
  }
}
