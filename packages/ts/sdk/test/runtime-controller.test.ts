import { describe, expect, it, vi } from 'vitest';

import { createCaptar, type CaptarEvent } from '../src/index.js';

describe('createCaptar', () => {
  it('emits a stable request span hierarchy and reconciles spend', async () => {
    const captar = createCaptar({
      project: 'support-bot',
    });
    const events: CaptarEvent[] = [];
    captar.onEvent((event) => {
      events.push(event);
    });

    const session = await captar.startSession({
      budget: {
        maxSpendUsd: 2,
        finalizationReserveUsd: 0.2,
      },
    });

    const client = {
      responses: {
        create: vi.fn(async () => ({
          model: 'gpt-4.1-mini',
          usage: {
            input_tokens: 100,
            output_tokens: 50,
          },
        })),
      },
      chat: {
        completions: {
          create: vi.fn(async () => ({
            model: 'gpt-4.1-mini',
            usage: {
              prompt_tokens: 50,
              completion_tokens: 25,
            },
          })),
        },
      },
    };

    const openai = captar.wrapOpenAI(client, { session });
    await openai.responses.create({
      model: 'gpt-4.1-mini',
      input: 'hello',
      max_output_tokens: 120,
    });

    const state = session.getState();
    expect(state.committedUsd).toBeGreaterThan(0);
    expect(state.reservedUsd).toBe(0);

    const requestEvents = events.filter((event) => event.span?.kind === 'request');
    expect(requestEvents.length).toBeGreaterThan(0);
    expect(new Set(requestEvents.map((event) => event.trace.spanId)).size).toBe(1);
    expect(requestEvents.every((event) => event.trace.parentSpanId === session.trace.spanId)).toBe(
      true
    );
    expect(events.find((event) => event.type === 'provider.response')?.span?.status).toBe(
      'completed'
    );
  });

  it('blocks disallowed models before making the provider call', async () => {
    const captar = createCaptar({
      project: 'support-bot',
    });
    const events: CaptarEvent[] = [];
    captar.onEvent((event) => {
      events.push(event);
    });

    const session = await captar.startSession({
      budget: { maxSpendUsd: 1 },
      policy: {
        call: {
          allowedModels: ['gpt-4.1-mini'],
        },
      },
    });

    const client = {
      responses: {
        create: vi.fn(async () => ({
          model: 'gpt-4.1',
        })),
      },
      chat: {
        completions: {
          create: vi.fn(),
        },
      },
    };

    const openai = captar.wrapOpenAI(client, { session });

    await expect(
      openai.responses.create({
        model: 'gpt-4.1',
        input: 'hello',
      })
    ).rejects.toThrow(/allow list/);
    expect(client.responses.create).not.toHaveBeenCalled();
    expect(session.getSummary().blockedCount).toBe(1);
    expect(events.find((event) => event.type === 'request.blocked')?.span?.status).toBe('blocked');
  });

  it('releases reserved spend and emits request.failed on provider errors', async () => {
    const captar = createCaptar({
      project: 'support-bot',
    });
    const events: CaptarEvent[] = [];
    captar.onEvent((event) => {
      events.push(event);
    });
    const session = await captar.startSession({
      budget: { maxSpendUsd: 2, finalizationReserveUsd: 0.1 },
    });

    const client = {
      responses: {
        create: vi.fn(async () => {
          throw new Error('provider unavailable');
        }),
      },
      chat: {
        completions: {
          create: vi.fn(),
        },
      },
    };

    const openai = captar.wrapOpenAI(client, { session });

    await expect(
      openai.responses.create({
        model: 'gpt-4.1-mini',
        input: 'hello',
        max_output_tokens: 120,
      })
    ).rejects.toThrow(/provider unavailable/);

    expect(session.getState().reservedUsd).toBe(0);
    expect(events.find((event) => event.type === 'request.failed')?.span?.status).toBe('failed');
    expect(
      events.find((event) => event.type === 'spend.committed')?.data.releasedUsd
    ).toBeGreaterThan(0);
  });

  it('tracks tool costs and preserves approval hooks', async () => {
    const captar = createCaptar({
      project: 'support-bot',
    });
    const session = await captar.startSession({
      budget: { maxSpendUsd: 2 },
      policy: {
        tool: {
          requireApprovalFor: ['zendesk.createComment'],
        },
      },
    });

    const tool = captar.trackTool('zendesk.createComment', {
      session,
      estimate: 0.25,
      actual: 0.1,
      approval: true,
    });

    const result = await tool.run(async () => 'ok');
    expect(result).toBe('ok');
    expect(session.getSummary().toolCallCount).toBe(1);
    expect(session.getSummary().totalCommittedUsd).toBe(0.1);
  });

  it('releases reserved tool spend and emits tool.failed on tool errors', async () => {
    const captar = createCaptar({
      project: 'support-bot',
    });
    const events: CaptarEvent[] = [];
    captar.onEvent((event) => {
      events.push(event);
    });
    const session = await captar.startSession({
      budget: { maxSpendUsd: 2 },
    });

    const tool = captar.trackTool('search.docs', {
      session,
      estimate: 0.25,
      actual: 0.1,
    });

    await expect(
      tool.run(async () => {
        throw new Error('tool crashed');
      })
    ).rejects.toThrow(/tool crashed/);

    expect(session.getState().reservedUsd).toBe(0);
    expect(events.find((event) => event.type === 'tool.failed')?.span?.status).toBe('failed');
    expect(
      events
        .filter((event) => event.type === 'spend.committed')
        .some((event) => Number(event.data.releasedUsd ?? 0) > 0)
    ).toBe(true);
  });
});

describe('hooks', () => {
  it('calls onPolicyViolation when call is blocked by policy', async () => {
    const onPolicyViolation = vi.fn();
    const captar = createCaptar({
      project: 'test',
      onPolicyViolation,
    });

    const events: CaptarEvent[] = [];
    captar.onEvent((event) => events.push(event));

    const session = await captar.startSession({
      budget: { maxSpendUsd: 2 },
      policy: {
        call: { blockedModels: ['gpt-4.1-mini'] },
      },
    });

    const client = {
      chat: {
        completions: {
          create: vi.fn(async () => ({
            usage: { prompt_tokens: 100, completion_tokens: 50 },
          })),
        },
      },
    };

    const openai = captar.wrapOpenAI(client, { session });

    const wrappedPromise = openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [{ role: 'user', content: 'hello' }],
    });

    await expect(wrappedPromise).rejects.toThrow();
    expect(onPolicyViolation).toHaveBeenCalledOnce();
    expect(onPolicyViolation).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: session.trace.traceId,
        reason: expect.stringContaining('gpt-4.1-mini'),
        type: expect.any(String),
      })
    );
  });
});
