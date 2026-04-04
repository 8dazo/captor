import type {
  EstimateResult,
  PricingEntry,
  ProviderAdapter,
  UsageRecord,
} from "@captar/types";
import { aggregateStreamUsage, estimateTokensFromText, roundUsd, withTimeout } from "@captar/utils";

import type { PricingRegistry } from "./pricing-registry.js";

type OpenAIRequest = Record<string, unknown>;
type OpenAIResponse = Record<string, unknown>;

export class OpenAIAdapter implements ProviderAdapter<OpenAIRequest, OpenAIResponse> {
  readonly provider = "openai";

  constructor(
    private readonly registry: PricingRegistry,
    private readonly executeRequest: (request: OpenAIRequest) => Promise<OpenAIResponse>,
    private readonly timeoutMs?: number,
  ) {}

  async estimate(request: OpenAIRequest): Promise<EstimateResult> {
    const model = typeof request.model === "string" ? request.model : "unknown";
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
    return await withTimeout(this.executeRequest(request), this.timeoutMs);
  }

  extractUsage(response: OpenAIResponse, estimatedCostUsd = 0): UsageRecord {
    const model = typeof response.model === "string" ? response.model : "unknown";
    const pricing = this.requirePricing(model);
    const usage = (response.usage as Record<string, number> | undefined) ?? {};
    const inputTokens = usage.input_tokens ?? usage.prompt_tokens;
    const outputTokens = usage.output_tokens ?? usage.completion_tokens;
    const cachedInputTokens = usage.cached_input_tokens;
    const usageProvided =
      typeof inputTokens === "number" ||
      typeof outputTokens === "number" ||
      typeof cachedInputTokens === "number";
    const costUsd = usageProvided
      ? this.calculateCost(pricing, {
          inputTokens,
          outputTokens,
          cachedInputTokens,
        })
      : estimatedCostUsd;

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

    return {
      provider: this.provider,
      model,
      ...usage,
      estimatedCostUsd,
      costUsd: hasUsage
        ? this.calculateCost(pricing, usage)
        : roundUsd(estimatedCostUsd),
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
    return roundUsd(
      ((usage.inputTokens ?? 0) / 1000) * pricing.inputCostPer1kTokensUsd +
        ((usage.outputTokens ?? 0) / 1000) * pricing.outputCostPer1kTokensUsd +
        ((usage.cachedInputTokens ?? 0) / 1000) *
          (pricing.cachedInputCostPer1kTokensUsd ?? 0),
    );
  }

  private requirePricing(model: string): PricingEntry {
    return (
      this.registry.get(this.provider, model) ?? {
        provider: this.provider,
        model,
        inputCostPer1kTokensUsd: 0,
        outputCostPer1kTokensUsd: 0,
      }
    );
  }
}
