import { describe, expect, it, vi } from 'vitest';

import { fingerprintRequest } from '@captar/utils';

import { createCaptar } from '../src/index.js';

describe('repetition fingerprints', () => {
  it('uses a collision-resistant digest of the complete canonical representation', () => {
    const sharedPrefix = 'prefix-'.repeat(8);
    const sharedSuffix = '-suffix'.repeat(8);
    const secret = 'customer-secret-do-not-export';
    const first = fingerprintRequest({
      text: `${sharedPrefix}AAAA${sharedSuffix}`,
      secret,
    });
    const second = fingerprintRequest({
      text: `${sharedPrefix}BBBB${sharedSuffix}`,
      secret,
    });

    expect(first).not.toBe(second);
    expect(first).toMatch(/^fp_sha256_[a-f0-9]{64}$/);
    expect(first).not.toContain(secret);
    expect(first).not.toContain(sharedPrefix);
  });

  it('is canonical across object key order', () => {
    const first = fingerprintRequest({
      model: 'gpt-4.1-mini',
      input: { b: 2, a: 1 },
      tools: [{ type: 'function', parameters: { required: ['x'], type: 'object' } }],
    });
    const second = fingerprintRequest({
      tools: [{ parameters: { type: 'object', required: ['x'] }, type: 'function' }],
      input: { a: 1, b: 2 },
      model: 'gpt-4.1-mini',
    });

    expect(first).toBe(second);
  });

  it('allows behaviorally distinct instructions and tool schemas but blocks the same semantic request', async () => {
    const providerCall = vi.fn(async () => ({
      model: 'gpt-4.1-mini',
      usage: { input_tokens: 1, output_tokens: 1 },
    }));
    const captar = createCaptar({ project: 'semantic-repetition' });
    const session = await captar.startSession({
      budget: { maxSpendUsd: 1, maxRepeatedCalls: 1 },
    });
    const openai = captar.wrapOpenAI(
      { responses: { create: providerCall } },
      { session },
    );

    await openai.responses.create({
      model: 'gpt-4.1-mini',
      input: 'same user input',
      instructions: 'Answer briefly.',
      tools: [
        {
          type: 'function',
          name: 'lookup',
          parameters: { type: 'object', properties: { query: { type: 'string' } } },
        },
      ],
      max_output_tokens: 1,
    });

    await openai.responses.create({
      model: 'gpt-4.1-mini',
      input: 'same user input',
      instructions: 'Answer with citations.',
      tools: [
        {
          type: 'function',
          name: 'lookup',
          parameters: { type: 'object', properties: { query: { type: 'string' } } },
        },
      ],
      max_output_tokens: 1,
    });

    const semanticRequest = {
      model: 'gpt-4.1-mini',
      input: 'same user input',
      instructions: 'Answer with citations.',
      tools: [
        {
          type: 'function',
          name: 'lookup',
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string' },
              limit: { type: 'number' },
            },
          },
        },
      ],
      max_output_tokens: 1,
    };

    await openai.responses.create(semanticRequest);

    await expect(
      openai.responses.create({
        max_output_tokens: 1,
        tools: [
          {
            parameters: {
              properties: {
                limit: { type: 'number' },
                query: { type: 'string' },
              },
              type: 'object',
            },
            name: 'lookup',
            type: 'function',
          },
        ],
        instructions: 'Answer with citations.',
        input: 'same user input',
        model: 'gpt-4.1-mini',
      }),
    ).rejects.toThrow(/repeated call fingerprint/i);

    expect(providerCall).toHaveBeenCalledTimes(3);
  });

  it('does not let stream transport options create a new semantic loop identity', async () => {
    const providerCall = vi.fn(async () => ({
      model: 'gpt-4.1-mini',
      usage: { input_tokens: 1, output_tokens: 1 },
    }));
    const captar = createCaptar({ project: 'stream-repetition' });
    const session = await captar.startSession({
      budget: { maxSpendUsd: 1, maxRepeatedCalls: 1 },
    });
    const openai = captar.wrapOpenAI(
      { chat: { completions: { create: providerCall } } },
      { session },
    );

    await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [{ role: 'user', content: 'same request' }],
      max_completion_tokens: 1,
      stream: false,
    });

    await expect(
      openai.chat.completions.create({
        stream_options: { include_usage: true },
        stream: true,
        max_completion_tokens: 1,
        messages: [{ content: 'same request', role: 'user' }],
        model: 'gpt-4.1-mini',
      }),
    ).rejects.toThrow(/repeated call fingerprint/i);

    expect(providerCall).toHaveBeenCalledOnce();
  });
});
