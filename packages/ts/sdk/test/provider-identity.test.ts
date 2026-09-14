import { describe, expect, it, vi } from 'vitest';

import { createCaptar, type CaptarEvent } from '../src/index.js';

describe('OpenAI-compatible provider identity', () => {
  it('defaults wrapped clients to openai', async () => {
    const captar = createCaptar({ project: 'provider-default' });
    const events: CaptarEvent[] = [];
    captar.onEvent((event) => events.push(event));

    const session = await captar.startSession({ budget: { maxSpendUsd: 1 } });
    const client = {
      chat: {
        completions: {
          create: vi.fn(async () => ({
            model: 'gpt-4.1-mini',
            usage: { prompt_tokens: 10, completion_tokens: 5 },
          })),
        },
      },
    };

    const wrapped = captar.wrapOpenAI(client, { session });
    await wrapped.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [{ role: 'user', content: 'hello' }],
    });

    expect(events.find((event) => event.type === 'request.started')?.data.provider).toBe('openai');
    expect(events.find((event) => event.type === 'provider.response')?.data.provider).toBe('openai');
    expect(
      events.find((event) => event.type === 'request.started')?.span?.attributes?.provider,
    ).toBe('openai');
  });

  it('propagates an explicit OpenRouter provider through telemetry', async () => {
    const captar = createCaptar({ project: 'provider-openrouter' });
    const events: CaptarEvent[] = [];
    captar.onEvent((event) => events.push(event));

    const session = await captar.startSession({ budget: { maxSpendUsd: 1 } });
    const client = {
      chat: {
        completions: {
          create: vi.fn(async () => ({
            model: 'openrouter/free',
            usage: { prompt_tokens: 12, completion_tokens: 6 },
          })),
        },
      },
    };

    const wrapped = captar.wrapOpenAI(client, {
      session,
      provider: 'openrouter',
    });

    await wrapped.chat.completions.create({
      model: 'openrouter/free',
      messages: [{ role: 'user', content: 'hello' }],
    });

    const providerEvents = events.filter((event) =>
      ['request.started', 'request.allowed', 'estimate.reserved', 'provider.response', 'spend.committed'].includes(
        event.type,
      ),
    );

    expect(providerEvents.length).toBeGreaterThan(0);
    expect(providerEvents.every((event) => event.data.provider === 'openrouter')).toBe(true);
    expect(
      events.find((event) => event.type === 'request.started')?.span?.attributes?.provider,
    ).toBe('openrouter');
  });
});
