import { describe, expect, it } from 'vitest';

import {
  applyPricingOverrides,
  builtinOpenAIPricing,
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

  it('validates every built-in OpenAI entry', () => {
    expect(() => applyPricingOverrides(builtinOpenAIPricing)).not.toThrow();
    expect(builtinOpenAIPricing.length).toBeGreaterThan(0);
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
});
