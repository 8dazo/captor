import { PolicyViolationError } from './errors.js';
import type { ResolvedPricing } from './pricing-registry.js';

export interface PricingUsage {
  inputTokens?: number;
  outputTokens?: number;
  cachedInputTokens?: number;
  cacheWriteTokens?: number;
}

export interface PricingCalculation {
  costUsd: number;
  conservative: boolean;
  longContextMultiplierApplied: boolean;
}

function nonNegative(value: number | undefined): number {
  return Math.max(0, value ?? 0);
}

/**
 * Stock built-in registry values are Standard-tier token prices. We cannot
 * infer a project's `auto` routing configuration, so omitted/auto/default
 * preserve the documented default Standard assumption. Explicit non-standard
 * tiers require caller-supplied pricing rather than silently applying Standard.
 */
export function assertLocallyPriceableServiceTier(
  request: Record<string, unknown>,
  pricing: ResolvedPricing,
): void {
  const tier = request.service_tier;
  if (
    tier === undefined ||
    tier === null ||
    tier === 'auto' ||
    tier === 'default' ||
    pricing.pricingSource === 'custom' ||
    pricing.pricingSource === 'custom_override'
  ) {
    return;
  }

  throw new PolicyViolationError(
    `Built-in Standard pricing does not safely model service_tier="${String(tier)}". Supply account-specific pricing for this model/tier before executing it.`,
  );
}

export function calculatePricingCost(
  pricing: ResolvedPricing,
  usage: PricingUsage,
  options: { conservativeUnknownCacheWrites?: boolean } = {},
): PricingCalculation {
  const inputTokens = nonNegative(usage.inputTokens);
  const outputTokens = nonNegative(usage.outputTokens);
  const cachedInputTokens = Math.min(inputTokens, nonNegative(usage.cachedInputTokens));
  const remainingAfterCacheHits = Math.max(0, inputTokens - cachedInputTokens);
  const explicitCacheWriteTokens = usage.cacheWriteTokens;
  let conservative = false;
  let cacheWriteTokens = 0;

  if (typeof explicitCacheWriteTokens === 'number') {
    cacheWriteTokens = Math.min(
      remainingAfterCacheHits,
      Math.max(0, explicitCacheWriteTokens),
    );
    if (cacheWriteTokens > 0 && pricing.rule?.cacheWriteCostPer1kTokensUsd === undefined) {
      throw new PolicyViolationError(
        `Provider reported cache-write tokens for ${pricing.entry.provider}:${pricing.entry.model}, but no cache-write price is configured.`,
      );
    }
  } else if (
    options.conservativeUnknownCacheWrites &&
    typeof pricing.rule?.cacheWriteCostPer1kTokensUsd === 'number'
  ) {
    cacheWriteTokens = remainingAfterCacheHits;
    conservative = true;
  }

  const ordinaryInputTokens = Math.max(
    0,
    inputTokens - cachedInputTokens - cacheWriteTokens,
  );
  const rule = pricing.rule;
  const longContextMultiplierApplied = Boolean(
    rule?.longContextThresholdTokens !== undefined &&
      inputTokens > rule.longContextThresholdTokens,
  );
  const inputMultiplier = longContextMultiplierApplied
    ? rule?.longContextInputMultiplier ?? 1
    : 1;
  const outputMultiplier = longContextMultiplierApplied
    ? rule?.longContextOutputMultiplier ?? 1
    : 1;
  const cachedRate =
    pricing.entry.cachedInputCostPer1kTokensUsd ??
    pricing.entry.inputCostPer1kTokensUsd;
  const cacheWriteRate =
    pricing.rule?.cacheWriteCostPer1kTokensUsd ??
    pricing.entry.inputCostPer1kTokensUsd;

  return {
    costUsd:
      (ordinaryInputTokens / 1000) * pricing.entry.inputCostPer1kTokensUsd * inputMultiplier +
      (cachedInputTokens / 1000) * cachedRate * inputMultiplier +
      (cacheWriteTokens / 1000) * cacheWriteRate * inputMultiplier +
      (outputTokens / 1000) * pricing.entry.outputCostPer1kTokensUsd * outputMultiplier,
    conservative,
    longContextMultiplierApplied,
  };
}
