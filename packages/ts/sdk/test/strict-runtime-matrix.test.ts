import { describe, expect, it, vi } from 'vitest';

import { createCaptar, type CaptarEvent } from '../src/index.js';

const zeroPricing = [
  {
    provider: 'test',
    model: 'matrix-free',
    inputCostPer1kTokensUsd: 0,
    outputCostPer1kTokensUsd: 0,
  },
];

const paidPricing = [
  {
    provider: 'test',
    model: 'matrix-paid',
    inputCostPer1kTokensUsd: 0.001,
    outputCostPer1kTokensUsd: 1,
  },
];

function paidResponse(cost?: number) {
  return {
    model: 'matrix-paid',
    usage: {
      input_tokens: 1,
      output_tokens: 1,
      ...(typeof cost === 'number' ? { cost } : {}),
    },
  };
}

describe('strict runtime enforcement matrix', () => {
  it('fails closed on unknown pricing without invoking the provider', async () => {
    const providerCall = vi.fn(async () => paidResponse());
    const captar = createCaptar({ project: 'matrix-unknown', pricing: paidPricing });
    const session = await captar.startSession({ budget: { maxSpendUsd: 1 } });
    const wrapped = captar.wrapOpenAI(
      { responses: { create: providerCall } },
      { session, provider: 'test' },
    );

    await expect(
      wrapped.responses.create({ model: 'unknown-model', input: 'hello' }),
    ).rejects.toThrow(/No pricing configured/);

    expect(providerCall).not.toHaveBeenCalled();
    expect(session.getState().committedUsd).toBe(0);
    expect(session.getState().reservedUsd).toBe(0);
  });

  it('accepts an explicit custom pricing override and enforces a provider ceiling', async () => {
    const providerCall = vi.fn(async () => ({
      model: 'override-model',
      usage: { input_tokens: 1, output_tokens: 1, cost: 0.001 },
    }));
    const captar = createCaptar({
      project: 'matrix-override',
      pricing: [],
      pricingOverrides: [
        {
          provider: 'test',
          model: 'override-model',
          inputCostPer1kTokensUsd: 0.001,
          outputCostPer1kTokensUsd: 1,
        },
      ],
    });
    const session = await captar.startSession({ budget: { maxSpendUsd: 0.01 } });
    const wrapped = captar.wrapOpenAI(
      { responses: { create: providerCall } },
      { session, provider: 'test' },
    );

    await wrapped.responses.create({ model: 'override-model', input: 'x' });

    expect(providerCall).toHaveBeenCalledOnce();
    expect(providerCall.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({ max_output_tokens: expect.any(Number) }),
    );
  });

  it('preserves a smaller caller Responses limit', async () => {
    const providerCall = vi.fn(async () => paidResponse());
    const captar = createCaptar({ project: 'matrix-response-cap', pricing: paidPricing });
    const session = await captar.startSession({ budget: { maxSpendUsd: 1 } });
    const wrapped = captar.wrapOpenAI(
      { responses: { create: providerCall } },
      { session, provider: 'test' },
    );

    await wrapped.responses.create({
      model: 'matrix-paid',
      input: 'x',
      max_output_tokens: 3,
    });

    expect(providerCall.mock.calls[0]?.[0]?.max_output_tokens).toBe(3);
  });

  it('preserves a smaller caller Chat Completions limit', async () => {
    const providerCall = vi.fn(async () => ({
      model: 'matrix-paid',
      usage: { prompt_tokens: 1, completion_tokens: 1 },
    }));
    const captar = createCaptar({ project: 'matrix-chat-cap', pricing: paidPricing });
    const session = await captar.startSession({ budget: { maxSpendUsd: 1 } });
    const wrapped = captar.wrapOpenAI(
      { chat: { completions: { create: providerCall } } },
      { session, provider: 'test' },
    );

    await wrapped.chat.completions.create({
      model: 'matrix-paid',
      messages: [{ role: 'user', content: 'x' }],
      max_tokens: 4,
    });

    expect(providerCall.mock.calls[0]?.[0]?.max_tokens).toBe(4);
  });

  it('blocks when the conservative input estimate cannot fit the hard budget', async () => {
    const providerCall = vi.fn(async () => paidResponse());
    const captar = createCaptar({
      project: 'matrix-input-budget',
      pricing: [
        {
          provider: 'test',
          model: 'input-expensive',
          inputCostPer1kTokensUsd: 1,
          outputCostPer1kTokensUsd: 1,
        },
      ],
    });
    const session = await captar.startSession({ budget: { maxSpendUsd: 0.001 } });
    const wrapped = captar.wrapOpenAI(
      { responses: { create: providerCall } },
      { session, provider: 'test' },
    );

    await expect(
      wrapped.responses.create({ model: 'input-expensive', input: 'long input' }),
    ).rejects.toThrow(/input cost/i);

    expect(providerCall).not.toHaveBeenCalled();
    expect(session.getState().reservedUsd).toBe(0);
  });

  it('blocks repeated identical calls before the second provider invocation', async () => {
    const providerCall = vi.fn(async () => ({
      model: 'matrix-free',
      usage: { input_tokens: 1, output_tokens: 1, cost: 0 },
    }));
    const captar = createCaptar({ project: 'matrix-repeat', pricing: zeroPricing });
    const session = await captar.startSession({
      budget: { maxSpendUsd: 1, maxRepeatedCalls: 1 },
    });
    const wrapped = captar.wrapOpenAI(
      { responses: { create: providerCall } },
      { session, provider: 'test' },
    );

    await wrapped.responses.create({ model: 'matrix-free', input: 'same' });
    await expect(
      wrapped.responses.create({ model: 'matrix-free', input: 'same' }),
    ).rejects.toThrow(/repeated call fingerprint/i);

    expect(providerCall).toHaveBeenCalledOnce();
  });

  it('releases the full reservation when the provider fails', async () => {
    const providerCall = vi.fn(async () => {
      throw new Error('provider failed');
    });
    const captar = createCaptar({ project: 'matrix-error', pricing: paidPricing });
    const session = await captar.startSession({ budget: { maxSpendUsd: 1 } });
    const wrapped = captar.wrapOpenAI(
      { responses: { create: providerCall } },
      { session, provider: 'test' },
    );

    await expect(
      wrapped.responses.create({
        model: 'matrix-paid',
        input: 'x',
        max_output_tokens: 10,
      }),
    ).rejects.toThrow(/provider failed/);

    expect(providerCall).toHaveBeenCalledOnce();
    expect(session.getState().reservedUsd).toBe(0);
    expect(session.getState().committedUsd).toBe(0);
  });

  it('records truthful provider overrun spend and emits a spend violation', async () => {
    const events: CaptarEvent[] = [];
    const providerCall = vi.fn(async () => ({
      model: 'matrix-free',
      usage: { input_tokens: 1, output_tokens: 1, cost: 0.2 },
    }));
    const captar = createCaptar({ project: 'matrix-overrun', pricing: zeroPricing });
    captar.onEvent((event) => events.push(event));
    const session = await captar.startSession({ budget: { maxSpendUsd: 0.1 } });
    const wrapped = captar.wrapOpenAI(
      { responses: { create: providerCall } },
      { session, provider: 'test' },
    );

    await wrapped.responses.create({ model: 'matrix-free', input: 'x' });

    expect(session.getState().committedUsd).toBe(0.2);
    expect(session.getState().remainingUsd).toBe(-0.1);
    expect(
      events.some(
        (event) =>
          event.type === 'guardrail.violation' && event.data.category === 'spend',
      ),
    ).toBe(true);
  });

  it('blocks the next call when the session call ceiling is exhausted', async () => {
    const providerCall = vi.fn(async () => ({
      model: 'matrix-free',
      usage: { input_tokens: 1, output_tokens: 1, cost: 0 },
    }));
    const captar = createCaptar({ project: 'matrix-call-count', pricing: zeroPricing });
    const session = await captar.startSession({
      budget: { maxSpendUsd: 1 },
      policy: { call: { maxCallsPerSession: 1 } },
    });
    const wrapped = captar.wrapOpenAI(
      { responses: { create: providerCall } },
      { session, provider: 'test' },
    );

    await wrapped.responses.create({ model: 'matrix-free', input: 'one' });
    await expect(
      wrapped.responses.create({ model: 'matrix-free', input: 'two' }),
    ).rejects.toThrow(/maxCallsPerSession=1/);

    expect(providerCall).toHaveBeenCalledOnce();
  });

  it('blocks concurrent execution and admits a call after the active slot is released', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let calls = 0;
    const providerCall = vi.fn(async () => {
      calls += 1;
      if (calls === 1) await gate;
      return {
        model: 'matrix-free',
        usage: { input_tokens: 1, output_tokens: 1, cost: 0 },
      };
    });
    const captar = createCaptar({ project: 'matrix-concurrency', pricing: zeroPricing });
    const session = await captar.startSession({
      budget: { maxSpendUsd: 1 },
      policy: { call: { maxConcurrentCalls: 1 } },
    });
    const wrapped = captar.wrapOpenAI(
      { responses: { create: providerCall } },
      { session, provider: 'test' },
    );

    const first = wrapped.responses.create({ model: 'matrix-free', input: 'one' });
    await vi.waitFor(() => expect(providerCall).toHaveBeenCalledTimes(1));

    await expect(
      wrapped.responses.create({ model: 'matrix-free', input: 'two' }),
    ).rejects.toThrow(/maxConcurrentCalls=1/);
    expect(providerCall).toHaveBeenCalledTimes(1);

    release();
    await first;
    await wrapped.responses.create({ model: 'matrix-free', input: 'three' });
    expect(providerCall).toHaveBeenCalledTimes(2);
  });

  it('finalizes streaming usage and leaves no reservation after consumption', async () => {
    const providerCall = vi.fn(async () => ({
      async *[Symbol.asyncIterator]() {
        yield { choices: [{ delta: { content: 'hello' } }] };
        yield {
          usage: {
            input_tokens: 1,
            output_tokens: 1,
            cost: 0.002,
          },
        };
      },
    }));
    const captar = createCaptar({ project: 'matrix-stream', pricing: paidPricing });
    const session = await captar.startSession({ budget: { maxSpendUsd: 1 } });
    const wrapped = captar.wrapOpenAI(
      { responses: { create: providerCall } },
      { session, provider: 'test' },
    );

    const stream = await wrapped.responses.create({
      model: 'matrix-paid',
      input: 'x',
      max_output_tokens: 8,
      stream: true,
    });

    for await (const _chunk of stream) {
      // Consume to completion so reconciliation runs.
    }

    expect(session.getState().reservedUsd).toBe(0);
    expect(session.getState().committedUsd).toBe(0.002);
  });
});
