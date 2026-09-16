import {
  applyPricingOverrides,
  builtinOpenAIPricing,
  builtinPricingRules,
  type BuiltinPricingRule,
} from "@captar/config";
import type { PricingEntry, PricingOverride } from "@captar/types";

export interface ResolvedPricing {
  entry: PricingEntry;
  rule?: BuiltinPricingRule;
  pricingVersion: string;
  pricingSource: string;
}

export class PricingRegistry {
  private readonly entries = new Map<string, PricingEntry>();
  private readonly overriddenKeys: ReadonlySet<string>;
  private readonly builtinSource: boolean;

  constructor(source: "builtin" | PricingEntry[] = "builtin", overrides: PricingOverride[] = []) {
    this.builtinSource = source === "builtin";
    this.overriddenKeys = new Set(
      overrides.map((override) => this.key(override.provider, override.model)),
    );
    const base: PricingEntry[] =
      source === "builtin" ? builtinOpenAIPricing : source;
    const merged = applyPricingOverrides(base, overrides);
    for (const entry of merged) {
      this.entries.set(this.key(entry.provider, entry.model), entry);
    }
  }

  get(provider: string, model: string): PricingEntry | undefined {
    return this.entries.get(this.key(provider, model));
  }

  resolve(provider: string, model: string): ResolvedPricing | undefined {
    const key = this.key(provider, model);
    const entry = this.entries.get(key);
    if (!entry) return undefined;

    const builtinRule = this.builtinSource ? builtinPricingRules.get(key) : undefined;
    const overridden = this.overriddenKeys.has(key);
    if (builtinRule) {
      return {
        entry,
        rule: builtinRule,
        pricingVersion: overridden ? `${builtinRule.pricingVersion}+custom` : builtinRule.pricingVersion,
        pricingSource: overridden ? 'custom_override' : builtinRule.pricingSource,
      };
    }

    return {
      entry,
      pricingVersion: entry.effectiveFrom ?? 'custom',
      pricingSource: 'custom',
    };
  }

  private key(provider: string, model: string): string {
    return `${provider}:${model}`;
  }
}
