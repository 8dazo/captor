import { describe, expect, it, vi } from 'vitest';

import { createCaptar, type CaptarEvent } from '../src/index.js';

const zeroPricing = [
  {
    provider: 'test',
    model: 'lifecycle-model',
    inputCostPer1kTokensUsd: 0,
    outputCostPer1kTokensUsd: 0,
  },
];

function completedResponse() {
  return {
    model: 'lifecycle-model',
    usage: { input_tokens: 1, output_tokens: 1, cost: 0 },
  };
}

function deferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function expectSessionClosedLast(events: CaptarEvent[]): void {
  const closedIndexes = events
    .map((event, index) => (event.type === 'session.closed' ? index : -1))
    .filter((index) => index >= 0);
  expect(closedIndexes).toHaveLength(1);
  expect(closedIndexes[0]).toBe(events.length - 1);
}

describe('session lifecycle', () => {
  it('rejects provider execution after close before request events or provider work', async () => {
    const events: CaptarEvent[] = [];
    const providerCall = vi.fn(async () => completedResponse());
    const captar = createCaptar({ project: 'closed-provider', pricing: zeroPricing });
    captar.onEvent((event) => events.push(event));
    const session = await captar.startSession();
    const wrapped = captar.wrapOpenAI(
      { responses: { create: providerCall } },
      { session, provider: 'test' },
    );

    await session.close();
    const eventCountAtClose = events.length;

    await expect(
      wrapped.responses.create({ model: 'lifecycle-model', input: 'too late' }),
    ).rejects.toThrow(/is closed and cannot accept new execution/i);

    expect(providerCall).not.toHaveBeenCalled();
    expect(events).toHaveLength(eventCountAtClose);
    expectSessionClosedLast(events);
  });

  it('rejects tracked-tool work after close before invoking user work', async () => {
    const events: CaptarEvent[] = [];
    const work = vi.fn(async () => 'should-not-run');
    const captar = createCaptar({ project: 'closed-tool', pricing: zeroPricing });
    captar.onEvent((event) => events.push(event));
    const session = await captar.startSession();
    const tool = captar.trackTool('search.docs', { session });

    await session.close();
    const eventCountAtClose = events.length;

    await expect(tool.run(work)).rejects.toThrow(/is closed and cannot accept new execution/i);
    expect(work).not.toHaveBeenCalled();
    expect(events).toHaveLength(eventCountAtClose);
    expectSessionClosedLast(events);
  });

  it('close drains an admitted non-stream request and blocks new work while closing', async () => {
    const events: CaptarEvent[] = [];
    const started = deferred<void>();
    const finish = deferred<void>();
    const providerCall = vi.fn(async () => {
      started.resolve();
      await finish.promise;
      return completedResponse();
    });
    const blockedProvider = vi.fn(async () => completedResponse());
    const captar = createCaptar({ project: 'drain-request', pricing: zeroPricing });
    captar.onEvent((event) => events.push(event));
    const session = await captar.startSession();
    const wrapped = captar.wrapOpenAI(
      { responses: { create: providerCall } },
      { session, provider: 'test' },
    );
    const second = captar.wrapOpenAI(
      { responses: { create: blockedProvider } },
      { session, provider: 'test' },
    );

    const callPromise = wrapped.responses.create({
      model: 'lifecycle-model',
      input: 'in flight',
    });
    await started.promise;

    let closeSettled = false;
    const closePromise = session.close().then((summary) => {
      closeSettled = true;
      return summary;
    });
    await Promise.resolve();
    expect(closeSettled).toBe(false);

    await expect(
      second.responses.create({ model: 'lifecycle-model', input: 'new work' }),
    ).rejects.toThrow(/is closing and cannot accept new execution/i);
    expect(blockedProvider).not.toHaveBeenCalled();

    finish.resolve();
    await expect(callPromise).resolves.toEqual(completedResponse());
    await closePromise;

    expect(closeSettled).toBe(true);
    expect(providerCall).toHaveBeenCalledOnce();
    expectSessionClosedLast(events);
  });

  it('close waits for an admitted stream to finish reconciliation before session.closed', async () => {
    const events: CaptarEvent[] = [];
    const firstChunkSeen = deferred<void>();
    const finishStream = deferred<void>();
    const providerCall = vi.fn(async () => ({
      async *[Symbol.asyncIterator]() {
        firstChunkSeen.resolve();
        yield { type: 'response.output_text.delta', delta: 'hello' };
        await finishStream.promise;
        yield {
          type: 'response.completed',
          response: {
            model: 'lifecycle-model',
            usage: { input_tokens: 1, output_tokens: 1, cost: 0 },
          },
        };
      },
    }));
    const captar = createCaptar({ project: 'drain-stream', pricing: zeroPricing });
    captar.onEvent((event) => events.push(event));
    const session = await captar.startSession();
    const wrapped = captar.wrapOpenAI(
      { responses: { create: providerCall } },
      { session, provider: 'test' },
    );

    const stream = await wrapped.responses.create({
      model: 'lifecycle-model',
      input: 'stream',
      stream: true,
    });

    let closeSettled = false;
    const closePromise = session.close().then((summary) => {
      closeSettled = true;
      return summary;
    });
    const consumePromise = (async () => {
      for await (const _chunk of stream) {
        // Drain the stream so both request and session leases can release.
      }
    })();

    await firstChunkSeen.promise;
    await Promise.resolve();
    expect(closeSettled).toBe(false);

    finishStream.resolve();
    await consumePromise;
    await closePromise;

    expect(closeSettled).toBe(true);
    const providerResponseIndex = events.findIndex((event) => event.type === 'provider.response');
    const sessionClosedIndex = events.findIndex((event) => event.type === 'session.closed');
    expect(providerResponseIndex).toBeGreaterThan(-1);
    expect(sessionClosedIndex).toBeGreaterThan(providerResponseIndex);
    expectSessionClosedLast(events);
  });

  it('close drains admitted tool work and rejects a second tool while closing', async () => {
    const events: CaptarEvent[] = [];
    const started = deferred<void>();
    const finish = deferred<void>();
    const secondWork = vi.fn(async () => 'blocked');
    const captar = createCaptar({ project: 'drain-tool', pricing: zeroPricing });
    captar.onEvent((event) => events.push(event));
    const session = await captar.startSession();
    const firstTool = captar.trackTool('first.tool', { session });
    const secondTool = captar.trackTool('second.tool', { session });

    const firstRun = firstTool.run(async () => {
      started.resolve();
      await finish.promise;
      return 'done';
    });
    await started.promise;

    let closeSettled = false;
    const closePromise = session.close().then((summary) => {
      closeSettled = true;
      return summary;
    });
    await Promise.resolve();
    expect(closeSettled).toBe(false);

    await expect(secondTool.run(secondWork)).rejects.toThrow(
      /is closing and cannot accept new execution/i,
    );
    expect(secondWork).not.toHaveBeenCalled();

    finish.resolve();
    await expect(firstRun).resolves.toBe('done');
    await closePromise;
    expectSessionClosedLast(events);
  });

  it('repeated close is idempotent and emits session.closed exactly once', async () => {
    const events: CaptarEvent[] = [];
    const captar = createCaptar({ project: 'idempotent-close', pricing: zeroPricing });
    captar.onEvent((event) => events.push(event));
    const session = await captar.startSession();

    const [first, second] = await Promise.all([session.close(), session.close()]);
    const third = await session.close();

    expect(second).toEqual(first);
    expect(third).toEqual(first);
    expect(events.filter((event) => event.type === 'session.closed')).toHaveLength(1);
    expectSessionClosedLast(events);
  });
});
