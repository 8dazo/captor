import { describe, expect, it, vi } from 'vitest';

import { createCaptar, type CaptarEvent } from '../src/index.js';

const quarterDollarOutputPricing = [
  {
    provider: 'test',
    model: 'budget-model',
    inputCostPer1kTokensUsd: 0,
    outputCostPer1kTokensUsd: 250,
  },
];

function softLimitEvents(events: CaptarEvent[]) {
  return events.filter(
    (event) => event.type === 'guardrail.violation' && event.data.softLimit === true,
  );
}

describe('operational budget policy fields', () => {
  it('protects the finalization reserve from ordinary wrappers and exposes it only to an explicit finalization wrapper', async () => {
    const providerCall = vi.fn(async (request: Record<string, unknown>) => ({
      model: 'budget-model',
      usage: {
        input_tokens: 0,
        output_tokens: request.max_output_tokens as number,
      },
    }));
    const captar = createCaptar({
      project: 'finalization-reserve',
      pricing: quarterDollarOutputPricing,
    });
    const session = await captar.startSession({
      budget: {
        maxSpendUsd: 1,
        finalizationReserveUsd: 0.25,
      },
    });
    const ordinary = captar.wrapOpenAI(
      { responses: { create: providerCall } },
      { session, provider: 'test' },
    );

    await ordinary.responses.create({
      model: 'budget-model',
      input: 'ordinary work',
      max_output_tokens: 4,
    });

    expect(providerCall.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({ max_output_tokens: 3 }),
    );
    expect(session.getState().committedUsd).toBeCloseTo(0.75, 10);

    await expect(
      ordinary.responses.create({
        model: 'budget-model',
        input: 'ordinary work again',
        max_output_tokens: 1,
      }),
    ).rejects.toThrow(/No output token fits|remaining spendable budget/i);
    expect(providerCall).toHaveBeenCalledTimes(1);

    const finalizer = captar.wrapOpenAI(
      { responses: { create: providerCall } },
      {
        session,
        provider: 'test',
        useFinalizationReserve: true,
      },
    );

    await finalizer.responses.create({
      model: 'budget-model',
      input: 'final answer',
      max_output_tokens: 4,
    });

    expect(providerCall.mock.calls[1]?.[0]).toEqual(
      expect.objectContaining({ max_output_tokens: 1 }),
    );
    expect(session.getState().committedUsd).toBeCloseTo(1, 10);

    await expect(
      finalizer.responses.create({
        model: 'budget-model',
        input: 'cannot exceed hard ceiling',
        max_output_tokens: 1,
      }),
    ).rejects.toThrow(/No output token fits|remaining spendable budget/i);
    expect(providerCall).toHaveBeenCalledTimes(2);
  });

  it('emits the soft budget threshold exactly once when committed LLM spend reaches the boundary', async () => {
    const events: CaptarEvent[] = [];
    const providerCall = vi.fn(async (request: Record<string, unknown>) => ({
      model: 'budget-model',
      usage: {
        input_tokens: 0,
        output_tokens: request.max_output_tokens as number,
      },
    }));
    const captar = createCaptar({
      project: 'soft-limit-llm',
      pricing: quarterDollarOutputPricing,
    });
    captar.onEvent((event) => events.push(event));
    const session = await captar.startSession({
      budget: { maxSpendUsd: 1, softLimitPct: 0.5 },
    });
    const wrapped = captar.wrapOpenAI(
      { responses: { create: providerCall } },
      { session, provider: 'test' },
    );

    await wrapped.responses.create({
      model: 'budget-model',
      input: 'first',
      max_output_tokens: 2,
    });
    await wrapped.responses.create({
      model: 'budget-model',
      input: 'second',
      max_output_tokens: 1,
    });

    expect(session.getState().committedUsd).toBeCloseTo(0.75, 10);
    expect(softLimitEvents(events)).toHaveLength(1);
    expect(softLimitEvents(events)[0]?.data).toEqual(
      expect.objectContaining({
        softLimit: true,
        softLimitPct: 0.5,
        thresholdUsd: 0.5,
        committedUsd: 0.5,
      }),
    );
  });

  it('applies the same one-shot soft threshold to tracked-tool spend', async () => {
    const events: CaptarEvent[] = [];
    const captar = createCaptar({ project: 'soft-limit-tool' });
    captar.onEvent((event) => events.push(event));
    const session = await captar.startSession({
      budget: { maxSpendUsd: 1, softLimitPct: 0.5 },
    });
    const first = captar.trackTool('tool.first', {
      session,
      estimate: 0.5,
      actual: 0.5,
    });
    const second = captar.trackTool('tool.second', {
      session,
      estimate: 0.1,
      actual: 0.1,
    });

    await first.run(async () => 'first');
    await second.run(async () => 'second');

    expect(softLimitEvents(events)).toHaveLength(1);
    expect(softLimitEvents(events)[0]?.data.thresholdUsd).toBe(0.5);
  });

  it('does not emit a soft-limit event without a finite maxSpendUsd', async () => {
    const events: CaptarEvent[] = [];
    const captar = createCaptar({ project: 'soft-limit-unlimited' });
    captar.onEvent((event) => events.push(event));
    const session = await captar.startSession({
      budget: { softLimitPct: 0.5 },
    });
    const tool = captar.trackTool('tool.unlimited', {
      session,
      estimate: 10,
      actual: 10,
    });

    await tool.run(async () => 'ok');

    expect(softLimitEvents(events)).toHaveLength(0);
  });

  it('rejects invalid softLimitPct values before session execution', async () => {
    const captar = createCaptar({ project: 'invalid-soft-limit' });

    await expect(
      captar.startSession({
        budget: { softLimitPct: 1.01 },
      }),
    ).rejects.toThrow(/softLimitPct.*between 0 and 1/i);
  });
});
