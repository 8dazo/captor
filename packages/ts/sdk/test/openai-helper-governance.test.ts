import { describe, expect, it, vi } from 'vitest';

import { createCaptar } from '../src/index.js';

const pricing = [
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

function streamResponse(namespace: 'responses' | 'chat') {
  return {
    async *[Symbol.asyncIterator]() {
      if (namespace === 'responses') {
        yield {
          type: 'response.completed',
          response: {
            model: 'wrapper-model',
            usage: { input_tokens: 1, output_tokens: 1, cost: 0 },
          },
        };
      } else {
        yield {
          choices: [],
          usage: { prompt_tokens: 1, completion_tokens: 1, cost: 0 },
        };
      }
    },
  };
}

function createOfficialStyleClient(
  responseProvider: ReturnType<typeof vi.fn>,
  chatProvider: ReturnType<typeof vi.fn>,
) {
  const client: Record<string, any> = {};

  class ResponsesResource {
    constructor(
      readonly _client: Record<string, any>,
      private readonly provider: ReturnType<typeof vi.fn>,
    ) {}

    create(body: Record<string, unknown>, options?: Record<string, unknown>) {
      return this.provider(body, options);
    }

    parse(body: Record<string, unknown>, options?: Record<string, unknown>) {
      return this._client.responses
        .create(body, options)
        ._thenUnwrap((response: Record<string, unknown>) => ({ ...response, parsed: true }));
    }

    stream(body: Record<string, unknown>, options?: Record<string, unknown>) {
      return this._client.responses.create({ ...body, stream: true }, options);
    }

    cancel() {
      return this._client === client ? 'original-client' : 'unexpected-client';
    }
  }

  class CompletionsResource {
    constructor(
      readonly _client: Record<string, any>,
      private readonly provider: ReturnType<typeof vi.fn>,
    ) {}

    create(body: Record<string, unknown>, options?: Record<string, unknown>) {
      return this.provider(body, options);
    }

    parse(body: Record<string, unknown>, options?: Record<string, unknown>) {
      return this._client.chat.completions
        .create(body, options)
        ._thenUnwrap((response: Record<string, unknown>) => ({ ...response, parsed: true }));
    }

    stream(body: Record<string, unknown>, options?: Record<string, unknown>) {
      return this._client.chat.completions.create({ ...body, stream: true }, options);
    }

    async runTools(body: Record<string, any>, options?: Record<string, unknown>) {
      await this._client.chat.completions.create(body, options);
      return await this._client.chat.completions.create(
        {
          ...body,
          messages: [
            ...(Array.isArray(body.messages) ? body.messages : []),
            { role: 'user', content: 'second governed step' },
          ],
        },
        options,
      );
    }
  }

  client.responses = new ResponsesResource(client, responseProvider);
  client.chat = {
    completions: new CompletionsResource(client, chatProvider),
  };
  return client;
}

describe('OpenAI helper governance', () => {
  it('routes Responses parse through Captar before provider execution', async () => {
    const responsesProvider = vi.fn(async () => completedResponse());
    const chatProvider = vi.fn(async () => completedResponse());
    const client = createOfficialStyleClient(responsesProvider, chatProvider);
    const captar = createCaptar({ project: 'responses-parse-helper', pricing });
    const session = await captar.startSession({
      policy: { call: { blockedModels: ['wrapper-model'] } },
    });
    const wrapped = captar.wrapOpenAI(client, { session, provider: 'test' });

    await expect(
      wrapped.responses.parse({ model: 'wrapper-model', input: 'blocked' }),
    ).rejects.toThrow(/blocked by policy/i);
    expect(responsesProvider).not.toHaveBeenCalled();
    expect(client.responses._client).toBe(client);
  });

  it('routes Chat parse through Captar and preserves RequestOptions', async () => {
    const responsesProvider = vi.fn(async () => completedResponse());
    const chatProvider = vi.fn(async (_body, options) => ({ ...completedResponse(), options }));
    const client = createOfficialStyleClient(responsesProvider, chatProvider);
    const captar = createCaptar({ project: 'chat-parse-helper', pricing });
    const session = await captar.startSession();
    const wrapped = captar.wrapOpenAI(client, { session, provider: 'test' });
    const options = {
      maxRetries: 0,
      headers: { 'x-helper-test': 'preserved' },
    };

    const parsed = await wrapped.chat.completions.parse(
      {
        model: 'wrapper-model',
        messages: [{ role: 'user', content: 'hello' }],
      },
      options,
    );

    expect(parsed.parsed).toBe(true);
    expect(chatProvider).toHaveBeenCalledOnce();
    expect(chatProvider.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        maxRetries: 0,
        headers: { 'x-helper-test': 'preserved' },
      }),
    );
    expect(client.chat.completions._client).toBe(client);
  });

  it('routes Responses and Chat stream helpers through governed create calls', async () => {
    const responsesProvider = vi.fn(async (body: Record<string, unknown>) =>
      body.stream ? streamResponse('responses') : completedResponse(),
    );
    const chatProvider = vi.fn(async (body: Record<string, unknown>) =>
      body.stream ? streamResponse('chat') : completedResponse(),
    );
    const client = createOfficialStyleClient(responsesProvider, chatProvider);
    const captar = createCaptar({ project: 'stream-helpers', pricing });
    const session = await captar.startSession();
    const wrapped = captar.wrapOpenAI(client, { session, provider: 'test' });

    const responsesStream = await wrapped.responses.stream({
      model: 'wrapper-model',
      input: 'hello',
    });
    for await (const _event of responsesStream) {
      // Consume to force Captar stream reconciliation.
    }

    const chatStream = await wrapped.chat.completions.stream({
      model: 'wrapper-model',
      messages: [{ role: 'user', content: 'hello' }],
    });
    for await (const _event of chatStream) {
      // Consume to force Captar stream reconciliation.
    }

    expect(responsesProvider).toHaveBeenCalledOnce();
    expect(responsesProvider.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({ stream: true }),
    );
    expect(chatProvider).toHaveBeenCalledOnce();
    expect(chatProvider.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({ stream: true }),
    );
  });

  it('governs every provider turn made by runTools instead of only the helper entry', async () => {
    const responsesProvider = vi.fn(async () => completedResponse());
    const chatProvider = vi.fn(async () => completedResponse());
    const client = createOfficialStyleClient(responsesProvider, chatProvider);
    const captar = createCaptar({ project: 'run-tools-helper', pricing });
    const session = await captar.startSession({
      policy: { call: { maxCallsPerSession: 1 } },
    });
    const wrapped = captar.wrapOpenAI(client, { session, provider: 'test' });

    await expect(
      wrapped.chat.completions.runTools({
        model: 'wrapper-model',
        messages: [{ role: 'user', content: 'first governed step' }],
      }),
    ).rejects.toThrow(/maxCallsPerSession=1/i);

    expect(chatProvider).toHaveBeenCalledOnce();
    expect(session.getSummary().requestCount).toBe(2);
  });

  it('keeps unrelated prototype methods bound to the original resource receiver', async () => {
    const responsesProvider = vi.fn(async () => completedResponse());
    const chatProvider = vi.fn(async () => completedResponse());
    const client = createOfficialStyleClient(responsesProvider, chatProvider);
    const captar = createCaptar({ project: 'helper-receiver-scope', pricing });
    const session = await captar.startSession();
    const wrapped = captar.wrapOpenAI(client, { session, provider: 'test' });

    expect(wrapped.responses.cancel()).toBe('original-client');
    expect(client.responses._client).toBe(client);
    expect(client.chat.completions._client).toBe(client);
  });
});
