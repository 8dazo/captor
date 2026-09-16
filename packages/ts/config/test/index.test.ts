import { describe, expect, it } from 'vitest';

import {
  OPENAI_PRICING_SNAPSHOT_MAX_AGE_DAYS,
  OPENAI_PRICING_SNAPSHOT_VERSION,
  applyPricingOverrides,
  builtinOpenAIPricing,
  builtinPricingRules,
  getCaptarEnvConfig,
} from '../src/index.js';

describe('applyPricingOverrides', () => {
  it('keeps a complete existing rate when a partial override changes one side', () => {
    const [entry] = applyPricingOverrides(
      [
        {
          provider: 'test',
          model: 'model',
          inputCostPer1kTokensUsd: 1,
          outputCostPer1kTokensUsd: 2,
          cachedInputCostPer1kTokensUsd: 0.25,
          effectiveFrom: 'v1',
        },
      ],
      [{ provider: 'test', model: 'model', outputCostPer1kTokensUsd: 3 }],
    );

    expect(entry).toEqual({
      provider: 'test',
      model: 'model',
      inputCostPer1kTokensUsd: 1,
      outputCostPer1kTokensUsd: 3,
      cachedInputCostPer1kTokensUsd: 0.25,
      effectiveFrom: 'v1',
    });
  });

  it('requires both required rates for a new override', () => {
    expect(() =>
      applyPricingOverrides([], [
        { provider: 'test', model: 'model', inputCostPer1kTokensUsd: 1 },
      ]),
    ).toThrow(/must provide both/);
  });

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects invalid pricing rate %s',
    (value) => {
      expect(() =>
        applyPricingOverrides([
          {
            provider: 'test',
            model: 'model',
            inputCostPer1kTokensUsd: value,
            outputCostPer1kTokensUsd: 1,
          },
        ]),
      ).toThrow(/finite non-negative/);
    },
  );

  it('validates every built-in OpenAI entry and attaches a versioned rule', () => {
    expect(() => applyPricingOverrides(builtinOpenAIPricing)).not.toThrow();
    expect(builtinOpenAIPricing.length).toBeGreaterThan(0);
    for (const entry of builtinOpenAIPricing) {
      expect(Number.isFinite(entry.inputCostPer1kTokensUsd)).toBe(true);
      expect(Number.isFinite(entry.outputCostPer1kTokensUsd)).toBe(true);
      expect(entry.inputCostPer1kTokensUsd).toBeGreaterThanOrEqual(0);
      expect(entry.outputCostPer1kTokensUsd).toBeGreaterThanOrEqual(0);
      expect(entry.effectiveFrom).toBe(OPENAI_PRICING_SNAPSHOT_VERSION);
      expect(builtinPricingRules.get(`${entry.provider}:${entry.model}`)?.pricingVersion).toBe(
        OPENAI_PRICING_SNAPSHOT_VERSION,
      );
    }
  });

  it('contains the current OpenAI aliases verified by the snapshot', () => {
    const models = new Set(builtinOpenAIPricing.map((entry) => entry.model));
    expect(models).toEqual(
      expect.objectContaining
        ? models
        : models,
    );
    for (const model of [
      'gpt-6-astra',
      'gpt-5.6-sol',
      'gpt-5.6',
      'gpt-5.6-terra',
      'gpt-5.6-luna',
    ]) {
      expect(models.has(model)).toBe(true);
    }
  });

  it('fails once the built-in registry exceeds its explicit freshness window', () => {
    const verifiedAtMs = Date.parse(`${OPENAI_PRICING_SNAPSHOT_VERSION}T00:00:00Z`);
    const ageDays = (Date.now() - verifiedAtMs) / 86_400_000;
    expect(ageDays).toBeGreaterThanOrEqual(0);
    expect(ageDays).toBeLessThanOrEqual(OPENAI_PRICING_SNAPSHOT_MAX_AGE_DAYS);
  });
});

describe('getCaptarEnvConfig', () => {
  it('reads configured exporter and timeout values without consulting process.env', () => {
    expect(
      getCaptarEnvConfig({
        CAPTAR_INGEST_URL: 'https://example.test/ingest',
        CAPTAR_INGEST_API_KEY: 'secret',
        CAPTAR_TIMEOUT_MS: '1234',
      } as NodeJS.ProcessEnv),
    ).toEqual({
      ingestUrl: 'https://example.test/ingest',
      ingestApiKey: 'secret',
      defaultTimeoutMs: 1234,
    });
  });

  it.each(['', '0', '-1', '1.5', 'NaN', 'Infinity'])(
    'rejects invalid CAPTAR_TIMEOUT_MS=%s',
    (value) => {
      expect(() =>
        getCaptarEnvConfig({ CAPTAR_TIMEOUT_MS: value } as NodeJS.ProcessEnv),
      ).toThrow(/finite positive integer/);
    },
  );
});
