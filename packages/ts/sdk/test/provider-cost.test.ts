import { describe, expect, it, vi } from 'vitest';

import { createCaptar, type CaptarEvent, type PricingEntry } from '../src/index.js';

const openRouterPricing: PricingEntry[] = [
  {
    provider: 'openrouter',
    model: 'openai/gpt-5',
    inputCostPer1kTokensUsd: 0.001,
    outputCostPer1kTokensUsd: 0.004,
  },
  {
    provider: 'openrouter',
    model: 'openrouter/free',
    inputCostPer1kTokensUsd: 0,
    outputCostPer1kTokensUsd: 0,
  },
];

function committedCost(events: CaptarEvent[]): number | undefined {
  return events
    .filter((event) => event.type === 'spend.committed')
    .map((event) => event.data.actualCostUsd)
    .find((value): value is number => typeof value === 'number' && value > 0);
}

describe('provider-reported actual cost', () => {
  it('uses usage.cost for non-streaming OpenRouter responses', async () => {
    const captar = createCaptar({ project: 'reported-cost', pricing: openRouterPricing });
    const events: CaptarEvent[] = [];
    captar.onEvent((event) => events.push(event));

    const session = await captar.startSession({ budget: { maxSpendUsd: 1 } });
    const client = {
      chat: {
        completions: {
          create: vi.fn(async () => ({
            model: 'openai/gpt-5',
            usage: {
              prompt_tokens: 100,
              completion_tokens: 50,
              cost: 0.01234567,
            },
          })),
        },
      },
    };

    const wrapped = captar.wrapOpenAI(client, { session, provider: 'openrouter' });
    await wrapped.chat.completions.create({
      model: 'openai/gpt-5',
      messages: [{ role: 'user', content: 'hello' }],
    });

    expect(committedCost(events)).toBe(0.01234567);
    expect(events.find((event) => event.type === 'provider.response')?.data.costUsd).toBe(
      0.01234567,
    );
  });

  it('accepts an authoritative zero provider cost when zero pricing is explicit', async () => {
    const captar = createCaptar({ project: 'reported-free-cost', pricing: openRouterPricing });
    const events: CaptarEvent[] = [];
    captar.onEvent((event) => events.push(event));

    const session = await captar.startSession({ budget: { maxSpendUsd: 1 } });
    const client = {
      chat: {
        completions: {
          create: vi.fn(async () => ({
            model: 'openrouter/free',
            usage: {
              prompt_tokens: 100,
              completion_tokens: 50,
              cost: 0,
            },
          })),
        },
      },
    };

    const wrapped = captar.wrapOpenAI(client, { session, provider: 'openrouter' });
    await wrapped.chat.completions.create({
      model: 'openrouter/free',
      messages: [{ role: 'user', content: 'hello' }],
    });

    expect(events.find((event) => event.type === 'provider.response')?.data.costUsd).toBe(0);
    expect(session.getState().committedUsd).toBe(0);
  });

  it('uses provider-reported cost from the final streaming usage chunk', async () => {
    const captar = createCaptar({ project: 'reported-stream-cost', pricing: openRouterPricing });
    const events: CaptarEvent[] = [];
    captar.onEvent((event) => events.push(event));

    const session = await captar.startSession({ budget: { maxSpendUsd: 1 } });
    const stream = {
      async *[Symbol.asyncIterator]() {
        yield { choices: [{ delta: { content: 'hello' } }] };
        yield {
          usage: {
            prompt_tokens: 20,
            completion_tokens: 10,
            cost: 0.004321,
          },
        };
      },
    };
    const client = {
      chat: {
        completions: {
          create: vi.fn(async () => stream),
        },
      },
    };

    const wrapped = captar.wrapOpenAI(client, { session, provider: 'openrouter' });
    const response = await wrapped.chat.completions.create({
      model: 'openai/gpt-5',
      messages: [{ role: 'user', content: 'hello' }],
      stream: true,
    });

    for await (const _chunk of response) {
      // Consume the stream so Captar can finalize usage and spend.
    }

    expect(committedCost(events)).toBe(0.004321);
    expect(events.find((event) => event.type === 'provider.response')?.data.costUsd).toBe(
      0.004321,
    );
  });

  it('falls back to local pricing when provider cost is absent', async () => {
    const captar = createCaptar({ project: 'pricing-fallback' });
    const events: CaptarEvent[] = [];
    captar.onEvent((event) => events.push(event));

    const session = await captar.startSession({ budget: { maxSpendUsd: 1 } });
    const client = {
      chat: {
        completions: {
          create: vi.fn(async () => ({
            model: 'gpt-4.1-mini',
            usage: {
              prompt_tokens: 100,
              completion_tokens: 50,
            },
          })),
        },
      },
    };

    const wrapped = captar.wrapOpenAI(client, { session });
    await wrapped.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [{ role: 'user', content: 'hello' }],
    });

    expect(events.find((event) => event.type === 'provider.response')?.data.costUsd).toEqual(
      expect.any(Number),
    );
    expect((events.find((event) => event.type === 'provider.response')?.data.costUsd as number) > 0).toBe(
      true,
    );
  });

  it('blocks unknown provider/model pricing before invoking the provider', async () => {
    const captar = createCaptar({ project: 'unknown-pricing' });
    const events: CaptarEvent[] = [];
    captar.onEvent((event) => events.push(event));
    const session = await captar.startSession({ budget: { maxSpendUsd: 1 } });
    const client = {
      chat: {
        completions: {
          create: vi.fn(async () => ({ model: 'openai/unknown-model', usage: { cost: 0.1 } })),
        },
      },
    };

    const wrapped = captar.wrapOpenAI(client, { session, provider: 'openrouter' });

    await expect(
      wrapped.chat.completions.create({
        model: 'openai/unknown-model',
        messages: [{ role: 'user', content: 'hello' }],
      }),
    ).rejects.toThrow(/No pricing configured/);

    expect(client.chat.completions.create).not.toHaveBeenCalled();
    expect(events.find((event) => event.type === 'request.blocked')).toBeDefined();
  });
});
