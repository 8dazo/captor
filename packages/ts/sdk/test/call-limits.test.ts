import { describe, expect, it, vi } from 'vitest';

import { createCaptar } from '../src/index.js';

const pricing = [
  {
    provider: 'test',
    model: 'limit-model',
    inputCostPer1kTokensUsd: 0,
    outputCostPer1kTokensUsd: 0,
  },
];

function completedResponse() {
  return {
    model: 'limit-model',
    usage: { input_tokens: 1, output_tokens: 1, cost: 0 },
  };
}

describe('session-wide LLM execution limits', () => {
  it('blocks calls above maxCallsPerSession before provider execution', async () => {
    const providerCall = vi.fn(async () => completedResponse());
    const captar = createCaptar({ project: 'call-limit', pricing });
    const session = await captar.startSession({
      budget: { maxSpendUsd: 1 },
      policy: { call: { maxCallsPerSession: 2 } },
    });
    const wrapped = captar.wrapOpenAI(
      { responses: { create: providerCall } },
      { session, provider: 'test' },
    );

    await wrapped.responses.create({ model: 'limit-model', input: 'one' });
    await wrapped.responses.create({ model: 'limit-model', input: 'two' });
    await expect(
      wrapped.responses.create({ model: 'limit-model', input: 'three' }),
    ).rejects.toThrow(/maxCallsPerSession=2/);

    expect(providerCall).toHaveBeenCalledTimes(2);
    expect(session.getSummary().requestCount).toBe(2);
    expect(session.getSummary().blockedCount).toBe(1);
  });

  it('shares the call ceiling across multiple wrappers on one session', async () => {
    const firstProvider = vi.fn(async () => completedResponse());
    const secondProvider = vi.fn(async () => completedResponse());
    const captar = createCaptar({ project: 'shared-call-limit', pricing });
    const session = await captar.startSession({
      budget: { maxSpendUsd: 1 },
      policy: { call: { maxCallsPerSession: 1 } },
    });

    const first = captar.wrapOpenAI(
      { responses: { create: firstProvider } },
      { session, provider: 'test' },
    );
    const second = captar.wrapOpenAI(
      { responses: { create: secondProvider } },
      { session, provider: 'test' },
    );

    await first.responses.create({ model: 'limit-model', input: 'one' });
    await expect(
      second.responses.create({ model: 'limit-model', input: 'two' }),
    ).rejects.toThrow(/maxCallsPerSession=1/);

    expect(firstProvider).toHaveBeenCalledOnce();
    expect(secondProvider).not.toHaveBeenCalled();
  });

  it('blocks concurrent provider execution and releases the slot after completion', async () => {
    let releaseFirst!: () => void;
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    let invocation = 0;
    const providerCall = vi.fn(async () => {
      invocation += 1;
      if (invocation === 1) await firstGate;
      return completedResponse();
    });
    const captar = createCaptar({ project: 'concurrency-limit', pricing });
    const session = await captar.startSession({
      budget: { maxSpendUsd: 1 },
      policy: { call: { maxConcurrentCalls: 1 } },
    });
    const wrapped = captar.wrapOpenAI(
      { responses: { create: providerCall } },
      { session, provider: 'test' },
    );

    const first = wrapped.responses.create({ model: 'limit-model', input: 'one' });
    await vi.waitFor(() => expect(providerCall).toHaveBeenCalledTimes(1));

    await expect(
      wrapped.responses.create({ model: 'limit-model', input: 'two' }),
    ).rejects.toThrow(/maxConcurrentCalls=1/);
    expect(providerCall).toHaveBeenCalledTimes(1);

    releaseFirst();
    await first;
    await wrapped.responses.create({ model: 'limit-model', input: 'three' });
    expect(providerCall).toHaveBeenCalledTimes(2);
  });

  it('keeps a concurrency slot for an active stream and releases it after consumption', async () => {
    let streamInvocation = 0;
    const providerCall = vi.fn(async () => {
      streamInvocation += 1;
      if (streamInvocation === 1) {
        return {
          async *[Symbol.asyncIterator]() {
            yield { delta: 'hello' };
            yield { usage: { input_tokens: 1, output_tokens: 1, cost: 0 } };
          },
        };
      }
      return completedResponse();
    });
    const captar = createCaptar({ project: 'stream-concurrency', pricing });
    const session = await captar.startSession({
      budget: { maxSpendUsd: 1 },
      policy: { call: { maxConcurrentCalls: 1 } },
    });
    const wrapped = captar.wrapOpenAI(
      { responses: { create: providerCall } },
      { session, provider: 'test' },
    );

    const stream = await wrapped.responses.create({
      model: 'limit-model',
      input: 'stream',
      stream: true,
    });

    await expect(
      wrapped.responses.create({ model: 'limit-model', input: 'blocked while stream active' }),
    ).rejects.toThrow(/maxConcurrentCalls=1/);
    expect(providerCall).toHaveBeenCalledTimes(1);

    for await (const _chunk of stream) {
      // Consume to completion so the request slot is released.
    }

    await wrapped.responses.create({ model: 'limit-model', input: 'after stream' });
    expect(providerCall).toHaveBeenCalledTimes(2);
  });

  it('releases a stream concurrency slot when the consumer cancels early', async () => {
    let streamInvocation = 0;
    const providerCall = vi.fn(async () => {
      streamInvocation += 1;
      if (streamInvocation === 1) {
        return {
          async *[Symbol.asyncIterator]() {
            yield { delta: 'first' };
            yield { delta: 'second' };
          },
        };
      }
      return completedResponse();
    });
    const captar = createCaptar({ project: 'stream-cancel', pricing });
    const session = await captar.startSession({
      budget: { maxSpendUsd: 1 },
      policy: { call: { maxConcurrentCalls: 1 } },
    });
    const wrapped = captar.wrapOpenAI(
      { responses: { create: providerCall } },
      { session, provider: 'test' },
    );

    const stream = await wrapped.responses.create({
      model: 'limit-model',
      input: 'stream',
      stream: true,
      max_output_tokens: 8,
    });

    for await (const _chunk of stream) {
      break;
    }

    expect(session.getState().reservedUsd).toBe(0);
    await wrapped.responses.create({ model: 'limit-model', input: 'after cancel' });
    expect(providerCall).toHaveBeenCalledTimes(2);
  });
});
