import { describe, expect, it, vi } from 'vitest';

import { createCaptar, type CaptarEvent, type PricingEntry } from '../src/index.js';

const cachedPricing: PricingEntry[] = [
  {
    provider: 'test',
    model: 'cached-model',
    inputCostPer1kTokensUsd: 1,
    outputCostPer1kTokensUsd: 0,
    cachedInputCostPer1kTokensUsd: 0.1,
  },
];

function committedCost(events: CaptarEvent[]): number | undefined {
  return events
    .filter((event) => event.type === 'spend.committed')
    .map((event) => event.data.actualCostUsd)
    .find((value): value is number => typeof value === 'number');
}

describe('cached-input accounting', () => {
  it('charges cached input at the cached rate instead of double-charging it', async () => {
    const events: CaptarEvent[] = [];
    const providerCall = vi.fn(async () => ({
      model: 'cached-model',
      usage: {
        input_tokens: 1000,
        output_tokens: 0,
        input_tokens_details: {
          cached_tokens: 800,
        },
      },
    }));
    const captar = createCaptar({ project: 'cached-responses', pricing: cachedPricing });
    captar.onEvent((event) => events.push(event));
    const session = await captar.startSession({ budget: { maxSpendUsd: 10 } });
    const wrapped = captar.wrapOpenAI(
      { responses: { create: providerCall } },
      { session, provider: 'test' },
    );

    await wrapped.responses.create({
      model: 'cached-model',
      input: 'x',
      max_output_tokens: 1,
    });

    // 200 uncached tokens * $1/1k + 800 cached tokens * $0.10/1k = $0.28.
    expect(committedCost(events)).toBe(0.28);
    expect(events.find((event) => event.type === 'provider.response')?.data.cachedInputTokens).toBe(
      800,
    );
  });

  it('reads Chat Completions prompt_tokens_details.cached_tokens', async () => {
    const events: CaptarEvent[] = [];
    const providerCall = vi.fn(async () => ({
      model: 'cached-model',
      usage: {
        prompt_tokens: 1000,
        completion_tokens: 0,
        prompt_tokens_details: {
          cached_tokens: 800,
        },
      },
    }));
    const captar = createCaptar({ project: 'cached-chat', pricing: cachedPricing });
    captar.onEvent((event) => events.push(event));
    const session = await captar.startSession({ budget: { maxSpendUsd: 10 } });
    const wrapped = captar.wrapOpenAI(
      { chat: { completions: { create: providerCall } } },
      { session, provider: 'test' },
    );

    await wrapped.chat.completions.create({
      model: 'cached-model',
      messages: [{ role: 'user', content: 'x' }],
      max_tokens: 1,
    });

    expect(committedCost(events)).toBe(0.28);
    expect(events.find((event) => event.type === 'provider.response')?.data.cachedInputTokens).toBe(
      800,
    );
  });

  it('falls back to the normal input price when no cached-input price exists', async () => {
    const events: CaptarEvent[] = [];
    const providerCall = vi.fn(async () => ({
      model: 'no-cache-rate',
      usage: {
        input_tokens: 1000,
        output_tokens: 0,
        input_tokens_details: { cached_tokens: 800 },
      },
    }));
    const captar = createCaptar({
      project: 'cached-fallback',
      pricing: [
        {
          provider: 'test',
          model: 'no-cache-rate',
          inputCostPer1kTokensUsd: 1,
          outputCostPer1kTokensUsd: 0,
        },
      ],
    });
    captar.onEvent((event) => events.push(event));
    const session = await captar.startSession({ budget: { maxSpendUsd: 10 } });
    const wrapped = captar.wrapOpenAI(
      { responses: { create: providerCall } },
      { session, provider: 'test' },
    );

    await wrapped.responses.create({
      model: 'no-cache-rate',
      input: 'x',
      max_output_tokens: 1,
    });

    expect(committedCost(events)).toBe(1);
  });
});

describe('pricing override validation', () => {
  it('rejects a brand-new partial pricing override instead of defaulting a missing rate to zero', () => {
    expect(() =>
      createCaptar({
        project: 'partial-override',
        pricing: [],
        pricingOverrides: [
          {
            provider: 'test',
            model: 'partial-model',
            outputCostPer1kTokensUsd: 1,
          },
        ],
      }),
    ).toThrow(/must provide both inputCostPer1kTokensUsd and outputCostPer1kTokensUsd/);
  });

  it('allows a partial override for an existing complete pricing entry', async () => {
    const providerCall = vi.fn(async () => ({
      model: 'existing-model',
      usage: { input_tokens: 0, output_tokens: 1000 },
    }));
    const captar = createCaptar({
      project: 'existing-override',
      pricing: [
        {
          provider: 'test',
          model: 'existing-model',
          inputCostPer1kTokensUsd: 0.5,
          outputCostPer1kTokensUsd: 1,
        },
      ],
      pricingOverrides: [
        {
          provider: 'test',
          model: 'existing-model',
          outputCostPer1kTokensUsd: 2,
        },
      ],
    });
    const session = await captar.startSession({ budget: { maxSpendUsd: 10 } });
    const wrapped = captar.wrapOpenAI(
      { responses: { create: providerCall } },
      { session, provider: 'test' },
    );

    await wrapped.responses.create({
      model: 'existing-model',
      input: 'x',
      max_output_tokens: 1,
    });

    expect(session.getState().committedUsd).toBe(2);
  });

  it.each([
    ['negative', -1],
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
  ])('rejects %s pricing rates', (_label, invalidRate) => {
    expect(() =>
      createCaptar({
        project: 'invalid-pricing',
        pricing: [
          {
            provider: 'test',
            model: 'invalid-model',
            inputCostPer1kTokensUsd: invalidRate,
            outputCostPer1kTokensUsd: 1,
          },
        ],
      }),
    ).toThrow(/finite non-negative/);
  });
});
