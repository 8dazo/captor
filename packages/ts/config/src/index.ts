import type {
  PricingEntry,
  PricingOverride,
  SessionPolicy,
} from "@captar/types";

export const OPENAI_PRICING_SNAPSHOT_VERSION = "2026-09-16";
export const OPENAI_PRICING_SNAPSHOT_MAX_AGE_DAYS = 120;
export const OPENAI_PRICING_SOURCE = "https://developers.openai.com/api/docs/models";

export interface BuiltinPricingRule {
  pricingVersion: string;
  pricingSource: string;
  cacheWriteCostPer1kTokensUsd?: number;
  longContextThresholdTokens?: number;
  longContextInputMultiplier?: number;
  longContextOutputMultiplier?: number;
}

function openAIEntry(
  model: string,
  inputCostPer1kTokensUsd: number,
  cachedInputCostPer1kTokensUsd: number,
  outputCostPer1kTokensUsd: number,
): PricingEntry {
  return {
    provider: "openai",
    model,
    inputCostPer1kTokensUsd,
    cachedInputCostPer1kTokensUsd,
    outputCostPer1kTokensUsd,
    effectiveFrom: OPENAI_PRICING_SNAPSHOT_VERSION,
  };
}

export const builtinOpenAIPricing: PricingEntry[] = [
  openAIEntry("gpt-6-astra", 0.01, 0.001, 0.05),
  openAIEntry("gpt-5.6-sol", 0.004, 0.0004, 0.02),
  openAIEntry("gpt-5.6", 0.004, 0.0004, 0.02),
  openAIEntry("gpt-5.6-terra", 0.002, 0.0002, 0.012),
  openAIEntry("gpt-5.6-luna", 0.0002, 0.00002, 0.0012),
  openAIEntry("gpt-4.1-mini", 0.0004, 0.0001, 0.0016),
  openAIEntry("gpt-4.1", 0.002, 0.0005, 0.008),
  openAIEntry("gpt-4o-mini", 0.00015, 0.000075, 0.0006),
];

const CURRENT_LONG_CONTEXT_RULE = {
  longContextThresholdTokens: 272_000,
  longContextInputMultiplier: 2,
  longContextOutputMultiplier: 1.5,
} as const;

function pricingRule(
  model: string,
  cacheWriteCostPer1kTokensUsd?: number,
): [string, BuiltinPricingRule] {
  return [
    `openai:${model}`,
    {
      pricingVersion: OPENAI_PRICING_SNAPSHOT_VERSION,
      pricingSource: `${OPENAI_PRICING_SOURCE}/${model}`,
      ...(typeof cacheWriteCostPer1kTokensUsd === "number"
        ? { cacheWriteCostPer1kTokensUsd }
        : {}),
      ...(model.startsWith("gpt-5.6") || model === "gpt-6-astra"
        ? CURRENT_LONG_CONTEXT_RULE
        : {}),
    },
  ];
}

export const builtinPricingRules: ReadonlyMap<string, BuiltinPricingRule> = new Map([
  pricingRule("gpt-6-astra", 0.0125),
  pricingRule("gpt-5.6-sol", 0.005),
  pricingRule("gpt-5.6", 0.005),
  pricingRule("gpt-5.6-terra", 0.0025),
  pricingRule("gpt-5.6-luna", 0.00025),
  pricingRule("gpt-4.1-mini"),
  pricingRule("gpt-4.1"),
  pricingRule("gpt-4o-mini"),
]);

export const defaultSessionPolicy: SessionPolicy = {
  budget: {
    softLimitPct: 0.8,
    finalizationReserveUsd: 0,
    maxRepeatedCalls: 3,
  },
  call: {
    timeoutMs: 30_000,
    retriesCeiling: 2,
  },
  tool: {
    maxCallsPerSession: 25,
  },
};

export interface CaptarEnvConfig {
  ingestUrl?: string;
  ingestApiKey?: string;
  defaultTimeoutMs?: number;
}

function parsePositiveInteger(value: string, label: string): number {
  const trimmed = value.trim();
  const parsed = Number(trimmed);
  if (!trimmed || !Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed <= 0) {
    throw new RangeError(`${label} must be a finite positive integer.`);
  }
  return parsed;
}

export function getCaptarEnvConfig(
  env: NodeJS.ProcessEnv = process.env,
): CaptarEnvConfig {
  const config: CaptarEnvConfig = {};

  if (env.CAPTAR_INGEST_URL) {
    config.ingestUrl = env.CAPTAR_INGEST_URL;
  }
  if (env.CAPTAR_INGEST_API_KEY) {
    config.ingestApiKey = env.CAPTAR_INGEST_API_KEY;
  }
  if (env.CAPTAR_TIMEOUT_MS !== undefined) {
    config.defaultTimeoutMs = parsePositiveInteger(
      env.CAPTAR_TIMEOUT_MS,
      "CAPTAR_TIMEOUT_MS",
    );
  }

  return config;
}

function assertPricingRate(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} must be a finite non-negative USD value.`);
  }
}

function validatePricingEntry(entry: PricingEntry): PricingEntry {
  if (!entry.provider.trim()) {
    throw new RangeError("Pricing provider must be a non-empty string.");
  }
  if (!entry.model.trim()) {
    throw new RangeError("Pricing model must be a non-empty string.");
  }

  assertPricingRate(
    entry.inputCostPer1kTokensUsd,
    `Input price for ${entry.provider}:${entry.model}`,
  );
  assertPricingRate(
    entry.outputCostPer1kTokensUsd,
    `Output price for ${entry.provider}:${entry.model}`,
  );
  if (typeof entry.cachedInputCostPer1kTokensUsd === "number") {
    assertPricingRate(
      entry.cachedInputCostPer1kTokensUsd,
      `Cached-input price for ${entry.provider}:${entry.model}`,
    );
  }

  return entry;
}

export function applyPricingOverrides(
  base: PricingEntry[],
  overrides: PricingOverride[] = [],
): PricingEntry[] {
  const index = new Map<string, PricingEntry>(
    base.map((entry) => {
      validatePricingEntry(entry);
      return [`${entry.provider}:${entry.model}`, entry];
    }),
  );

  for (const override of overrides) {
    const key = `${override.provider}:${override.model}`;
    const existing = index.get(key);

    if (
      !existing &&
      (typeof override.inputCostPer1kTokensUsd !== "number" ||
        typeof override.outputCostPer1kTokensUsd !== "number")
    ) {
      throw new RangeError(
        `A new pricing override for ${key} must provide both inputCostPer1kTokensUsd and outputCostPer1kTokensUsd.`,
      );
    }

    const next: PricingEntry = {
      provider: override.provider,
      model: override.model,
      inputCostPer1kTokensUsd:
        override.inputCostPer1kTokensUsd ?? existing!.inputCostPer1kTokensUsd,
      outputCostPer1kTokensUsd:
        override.outputCostPer1kTokensUsd ?? existing!.outputCostPer1kTokensUsd,
      effectiveFrom: existing?.effectiveFrom ?? "custom",
    };

    const cachedInputCostPer1kTokensUsd =
      override.cachedInputCostPer1kTokensUsd ??
      existing?.cachedInputCostPer1kTokensUsd;

    if (typeof cachedInputCostPer1kTokensUsd === "number") {
      next.cachedInputCostPer1kTokensUsd = cachedInputCostPer1kTokensUsd;
    }

    validatePricingEntry(next);
    index.set(key, next);
  }

  return Array.from(index.values());
}
