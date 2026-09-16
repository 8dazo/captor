import type {
  EstimateResult,
  PricingEntry,
  ProviderAdapter,
  UsageRecord,
} from "@captar/types";
import { aggregateStreamUsage, estimateTokensFromText, roundUsd, withTimeout } from "@captar/utils";

import { PolicyViolationError } from "./errors.js";
import type { PricingRegistry } from "./pricing-registry.js";

type OpenAIRequest = Record<string, unknown>;
type OpenAIResponse = Record<string, unknown>;

function usageNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : undefined;
}

function objectRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
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

  if (typeof cached !== "number") {
    return undefined;
  }

  return typeof inputTokens === "number" ? Math.min(inputTokens, cached) : cached;
}

export class OpenAIAdapter implements ProviderAdapter<OpenAIRequest, OpenAIResponse> {
  readonly provider: string;
  private estimatedModel?: string;

  constructor(
    private readonly registry: PricingRegistry,
    private readonly executeRequest: (request: OpenAIRequest) => Promise<OpenAIResponse>,
    private readonly timeoutMs?: number,
    provider = "openai",
  ) {
    this.provider = provider;
  }

  async estimate(request: OpenAIRequest): Promise<EstimateResult> {
    const model = typeof request.model === "string" ? request.model : "unknown";
    this.estimatedModel = model;
    const pricing = this.requirePricing(model);
    const estimatedInputTokens = estimateTokensFromText(request.input ?? request.messages);
    const estimatedOutputTokens = this.resolveOutputTokens(request);
    const estimatedCostUsd = this.calculateCost(pricing, {
      inputTokens: estimatedInputTokens,
      outputTokens: estimatedOutputTokens,
      cachedInputTokens: 0,
    });

    return {
      provider: this.provider,
      model,
      estimatedInputTokens,
      estimatedOutputTokens,
      estimatedCostUsd,
    };
  }

  async execute(request: OpenAIRequest): Promise<OpenAIResponse> {
    const model = typeof request.model === "string" ? request.model : this.estimatedModel ?? "unknown";
    this.estimatedModel = model;
    this.requirePricing(model);
    return await withTimeout(this.executeRequest(request), this.timeoutMs);
  }

  extractUsage(response: OpenAIResponse, estimatedCostUsd = 0): UsageRecord {
    const model =
      typeof response.model === "string"
        ? response.model
        : this.estimatedModel ?? "unknown";
    const pricing = this.requirePricing(model);
    const usage = objectRecord(response.usage) ?? {};
    const inputTokens = usageNumber(usage.input_tokens) ?? usageNumber(usage.prompt_tokens);
    const outputTokens = usageNumber(usage.output_tokens) ?? usageNumber(usage.completion_tokens);
    const cachedInputTokens = cachedTokensFromUsage(usage, inputTokens);
    const usageProvided =
      typeof inputTokens === "number" ||
      typeof outputTokens === "number" ||
      typeof cachedInputTokens === "number";
    const providerCost = usageNumber(usage.cost);
    const costUsd =
      typeof providerCost === "number"
        ? roundUsd(providerCost)
        : usageProvided
          ? this.calculateCost(pricing, {
              inputTokens,
              outputTokens,
              cachedInputTokens,
            })
          : roundUsd(estimatedCostUsd);

    return {
      provider: this.provider,
      model,
      inputTokens,
      outputTokens,
      cachedInputTokens,
      estimatedCostUsd,
      costUsd,
    };
  }

  extractStreamUsage(
    model: string,
    chunks: Array<Partial<Record<string, number>>>,
    estimatedCostUsd = 0,
  ): UsageRecord {
    const pricing = this.requirePricing(model);
    const usage = aggregateStreamUsage(chunks);
    const hasUsage =
      typeof usage.inputTokens === "number" ||
      typeof usage.outputTokens === "number" ||
      typeof usage.cachedInputTokens === "number";
    const costUsd =
      typeof usage.costUsd === "number"
        ? usage.costUsd
        : hasUsage
          ? this.calculateCost(pricing, usage)
          : roundUsd(estimatedCostUsd);

    return {
      provider: this.provider,
      model,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      cachedInputTokens: usage.cachedInputTokens,
      estimatedCostUsd,
      costUsd,
    };
  }

  private resolveOutputTokens(request: OpenAIRequest): number {
    const value = request.max_output_tokens ?? request.max_tokens;
    return typeof value === "number" ? value : 256;
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

    return roundUsd(
      (uncachedInputTokens / 1000) * pricing.inputCostPer1kTokensUsd +
        (cachedInputTokens / 1000) * cachedInputRate +
        ((usage.outputTokens ?? 0) / 1000) * pricing.outputCostPer1kTokensUsd,
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
