import { describe, expect, it, vi } from 'vitest';

import { createCaptar, type CaptarEvent } from '../src/index.js';

describe('provider-side budget overruns', () => {
  it('records truthful provider spend and emits a spend violation when actual cost exceeds the hard budget', async () => {
    const events: CaptarEvent[] = [];
    const providerCall = vi.fn(async () => ({
      model: 'reported-cost-model',
      usage: {
        input_tokens: 1,
        output_tokens: 1,
        cost: 1.2,
      },
    }));
    const captar = createCaptar({
      project: 'provider-overrun',
      pricing: [
        {
          provider: 'test',
          model: 'reported-cost-model',
          inputCostPer1kTokensUsd: 0,
          outputCostPer1kTokensUsd: 0,
        },
      ],
    });
    captar.onEvent((event) => events.push(event));
    const session = await captar.startSession({ budget: { maxSpendUsd: 1 } });
    const wrapped = captar.wrapOpenAI(
      { responses: { create: providerCall } },
      { session, provider: 'test' },
    );

    await wrapped.responses.create({ model: 'reported-cost-model', input: 'hello' });

    expect(providerCall).toHaveBeenCalledOnce();
    expect(session.getState()).toEqual({
      committedUsd: 1.2,
      reservedUsd: 0,
      remainingUsd: -0.2,
    });

    const spend = events.find((event) => event.type === 'spend.committed');
    expect(spend?.data.reservationOverrunUsd).toBe(1.2);
    expect(spend?.data.hardBudgetOverrunUsd).toBe(0.2);

    const violation = events.find((event) => event.type === 'guardrail.violation');
    expect(violation?.data.category).toBe('spend');
    expect(violation?.data.hardBudgetOverrunUsd).toBe(0.2);
  });

  it('emits the same spend-overrun signal for tracked tools', async () => {
    const events: CaptarEvent[] = [];
    const captar = createCaptar({ project: 'tool-overrun' });
    captar.onEvent((event) => events.push(event));
    const session = await captar.startSession({ budget: { maxSpendUsd: 1 } });
    const tool = captar.trackTool('expensive-tool', {
      session,
      estimate: 0.2,
      actual: 1.1,
    });

    await tool.run(async () => 'done');

    expect(session.getState().committedUsd).toBe(1.1);
    const violation = events.find((event) => event.type === 'guardrail.violation');
    expect(violation?.data.category).toBe('spend');
    expect(violation?.data.hardBudgetOverrunUsd).toBe(0.1);
  });
});
