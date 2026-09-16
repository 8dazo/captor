import { describe, expect, it, vi } from 'vitest';

import { createCaptar, type CaptarEvent } from '../src/index.js';

const zeroPricing = [
  {
    provider: 'test',
    model: 'wrapper-model',
    inputCostPer1kTokensUsd: 0,
    outputCostPer1kTokensUsd: 0,
  },
];

function completedResponse() {
  return {
    model: 'wrapper-model',
    usage: { input_tokens: 1, output_tokens: 1, cost: 0 },
  };
}

describe('OpenAI wrapper compatibility', () => {
  it('preserves prototype methods and method receivers while intercepting create', async () => {
    class ResponsesResource {
      readonly marker = 'responses-resource';

      async create() {
        return completedResponse();
      }

      stream() {
        return `stream:${this.marker}`;
      }

      cancel() {
        return `cancel:${this.marker}`;
      }
    }

    class CompletionsResource {
      readonly marker = 'completions-resource';

      async create() {
        return completedResponse();
      }

      parse() {
        return `parse:${this.marker}`;
      }

      stream() {
        return `stream:${this.marker}`;
      }
    }

    const client = {
      responses: new ResponsesResource(),
      chat: { completions: new CompletionsResource() },
    };
    const captar = createCaptar({ project: 'prototype-preservation', pricing: zeroPricing });
    const session = await captar.startSession({ budget: { maxSpendUsd: 1 } });
    const wrapped = captar.wrapOpenAI(client, { session, provider: 'test' });

    expect(wrapped.responses.stream()).toBe('stream:responses-resource');
    expect(wrapped.responses.cancel()).toBe('cancel:responses-resource');
    expect(wrapped.chat.completions.parse()).toBe('parse:completions-resource');
    expect(wrapped.chat.completions.stream()).toBe('stream:completions-resource');

    await wrapped.responses.create({ model: 'wrapper-model', input: 'hello' });
    await wrapped.chat.completions.create({
      model: 'wrapper-model',
      messages: [{ role: 'user', content: 'hello' }],
    });
  });

  it('forwards OpenAI RequestOptions while composing caller cancellation with Captar timeout', async () => {
    const controller = new AbortController();
    const providerCall = vi.fn(async (_request: unknown, options?: Record<string, unknown>) => ({
      ...completedResponse(),
      options,
    }));
    const captar = createCaptar({ project: 'request-options', pricing: zeroPricing });
    const session = await captar.startSession({
      budget: { maxSpendUsd: 1 },
      policy: { call: { timeoutMs: 30_000 } },
    });
    const wrapped = captar.wrapOpenAI(
      { responses: { create: providerCall } },
      { session, provider: 'test' },
    );
    const options = {
      signal: controller.signal,
      maxRetries: 0,
      headers: { 'x-captor-test': 'preserved' },
    };

    await wrapped.responses.create(
      { model: 'wrapper-model', input: 'hello' },
      options,
    );

    expect(providerCall).toHaveBeenCalledOnce();
    const forwarded = providerCall.mock.calls[0]?.[1] as Record<string, unknown> | undefined;
    expect(forwarded).toEqual(
      expect.objectContaining({
        maxRetries: 0,
        headers: { 'x-captor-test': 'preserved' },
      }),
    );
    expect(forwarded?.signal).toBeInstanceOf(AbortSignal);
    expect(forwarded?.signal).not.toBe(controller.signal);
  });

  it('aborts the provider request when the Captar timeout expires', async () => {
    let providerSawAbort = false;
    const providerCall = vi.fn(
      async (_request: unknown, options?: { signal?: AbortSignal }) =>
        await new Promise((_resolve, reject) => {
          const signal = options?.signal;
          if (!signal) {
            reject(new Error('missing provider AbortSignal'));
            return;
          }
          const onAbort = () => {
            providerSawAbort = true;
            reject(signal.reason instanceof Error ? signal.reason : new Error('aborted'));
          };
          if (signal.aborted) {
            onAbort();
          } else {
            signal.addEventListener('abort', onAbort, { once: true });
          }
        }),
    );
    const captar = createCaptar({ project: 'timeout-abort', pricing: zeroPricing });
    const session = await captar.startSession({
      budget: { maxSpendUsd: 1 },
      policy: { call: { timeoutMs: 5 } },
    });
    const wrapped = captar.wrapOpenAI(
      { responses: { create: providerCall } },
      { session, provider: 'test' },
    );

    await expect(
      wrapped.responses.create({ model: 'wrapper-model', input: 'hello' }),
    ).rejects.toThrow(/Captar provider timeout/);
    expect(providerSawAbort).toBe(true);
    expect(session.getState().reservedUsd).toBe(0);
  });
});

describe('session-owned guardrail state', () => {
  it('cannot bypass repeated-call detection by creating another wrapper', async () => {
    const firstProvider = vi.fn(async () => completedResponse());
    const secondProvider = vi.fn(async () => completedResponse());
    const captar = createCaptar({ project: 'repeat-state', pricing: zeroPricing });
    const session = await captar.startSession({
      budget: { maxSpendUsd: 1 },
      policy: { budget: { maxRepeatedCalls: 1 } },
    });
    const first = captar.wrapOpenAI(
      { responses: { create: firstProvider } },
      { session, provider: 'test' },
    );
    const second = captar.wrapOpenAI(
      { responses: { create: secondProvider } },
      { session, provider: 'test' },
    );
    const request = { model: 'wrapper-model', input: 'same request' };

    await first.responses.create(request);
    await expect(second.responses.create(request)).rejects.toThrow(/repeated call fingerprint/i);

    expect(firstProvider).toHaveBeenCalledOnce();
    expect(secondProvider).not.toHaveBeenCalled();
  });

  it('enforces tool maxCallsPerSession across different handles and tool names', async () => {
    const captar = createCaptar({ project: 'tool-state', pricing: zeroPricing });
    const session = await captar.startSession({
      budget: { maxSpendUsd: 1 },
      policy: { tool: { maxCallsPerSession: 1 } },
    });
    const first = captar.trackTool('first.tool', { session });
    const second = captar.trackTool('second.tool', { session });

    await expect(first.run(async () => 'first')).resolves.toBe('first');
    await expect(second.run(async () => 'second')).rejects.toThrow(/tool maxCallsPerSession=1/);
    expect(session.getSummary().toolCallCount).toBe(1);
  });
});

describe('current OpenAI token and streaming semantics', () => {
  it('uses max_completion_tokens for OpenAI Chat Completions by default', async () => {
    const providerCall = vi.fn(async () => ({
      model: 'gpt-4.1-mini',
      usage: { prompt_tokens: 1, completion_tokens: 1 },
    }));
    const captar = createCaptar({ project: 'modern-chat-limit' });
    const session = await captar.startSession({ budget: { maxSpendUsd: 1 } });
    const wrapped = captar.wrapOpenAI(
      { chat: { completions: { create: providerCall } } },
      { session },
    );

    await wrapped.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [{ role: 'user', content: 'hello' }],
    });

    const sent = providerCall.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(sent.max_completion_tokens).toEqual(expect.any(Number));
    expect(sent.max_tokens).toBeUndefined();
  });

  it('forces Chat streaming usage on official OpenAI and reconciles the final usage snapshot', async () => {
    const events: CaptarEvent[] = [];
    const providerCall = vi.fn(async (request: Record<string, unknown>) => ({
      async *[Symbol.asyncIterator]() {
        yield { choices: [{ delta: { content: 'hello' } }] };
        yield {
          choices: [],
          usage: { prompt_tokens: 10, completion_tokens: 5 },
        };
      },
      request,
    }));
    const captar = createCaptar({ project: 'chat-stream-usage' });
    captar.onEvent((event) => events.push(event));
    const session = await captar.startSession({ budget: { maxSpendUsd: 1 } });
    const wrapped = captar.wrapOpenAI(
      { chat: { completions: { create: providerCall } } },
      { session },
    );

    const stream = await wrapped.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [{ role: 'user', content: 'hello' }],
      stream: true,
    });
    for await (const _chunk of stream) {
      // Consume the provider stream completely.
    }

    const sent = providerCall.mock.calls[0]?.[0] as Record<string, any>;
    expect(sent.stream_options).toEqual(expect.objectContaining({ include_usage: true }));
    const responseEvent = events.find((event) => event.type === 'provider.response');
    expect(responseEvent?.data).toEqual(
      expect.objectContaining({
        stream: true,
        usageSource: 'provider',
        inputTokens: 10,
        outputTokens: 5,
      }),
    );
    expect(responseEvent?.data.response).toBeUndefined();
  });

  it('reads Responses streaming usage from response.completed.response.usage', async () => {
    const events: CaptarEvent[] = [];
    const providerCall = vi.fn(async () => ({
      async *[Symbol.asyncIterator]() {
        yield { type: 'response.output_text.delta', delta: 'hello' };
        yield {
          type: 'response.completed',
          response: {
            model: 'gpt-4.1-mini',
            usage: { input_tokens: 8, output_tokens: 3 },
          },
        };
      },
    }));
    const captar = createCaptar({ project: 'responses-stream-usage' });
    captar.onEvent((event) => events.push(event));
    const session = await captar.startSession({ budget: { maxSpendUsd: 1 } });
    const wrapped = captar.wrapOpenAI(
      { responses: { create: providerCall } },
      { session },
    );

    const stream = await wrapped.responses.create({
      model: 'gpt-4.1-mini',
      input: 'hello',
      stream: true,
    });
    for await (const _chunk of stream) {
      // Consume the provider stream completely.
    }

    expect(events.find((event) => event.type === 'provider.response')?.data).toEqual(
      expect.objectContaining({
        usageSource: 'provider',
        inputTokens: 8,
        outputTokens: 3,
      }),
    );
  });
});
