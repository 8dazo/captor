import {
  applyPricingOverrides,
  builtinOpenAIPricing,
} from "@captar/config";
import type { PricingEntry, PricingOverride } from "@captar/types";

export class PricingRegistry {
  private readonly entries = new Map<string, PricingEntry>();

  constructor(source: "builtin" | PricingEntry[] = "builtin", overrides: PricingOverride[] = []) {
    const base = source === "builtin" ? builtinOpenAIPricing : source;
    const merged = applyPricingOverrides(base, overrides);
    for (const entry of merged) {
      this.entries.set(this.key(entry.provider, entry.model), entry);
    }
  }

  get(provider: string, model: string): PricingEntry | undefined {
    return this.entries.get(this.key(provider, model));
  }

  private key(provider: string, model: string): string {
    return `${provider}:${model}`;
  }
}
