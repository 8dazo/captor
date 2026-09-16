import { describe, expect, it, vi } from 'vitest';

import { createCaptar, type CaptarEvent } from '../src/index.js';
import { BudgetPlanner } from '../src/internal/budget-planner.js';
import { PricingRegistry } from '../src/internal/pricing-registry.js';

describe('high-precision USD accounting', () => {
  it('keeps a one-token sub-micro estimate nonzero during planning', () => {
    const planner = new BudgetPlanner(
      new PricingRegistry([
        {
          provider: 'test',
          model: 'tiny-model',
          inputCostPer1kTokensUsd: 0.00015,
          outputCostPer1kTokensUsd: 0,
        },
      ]),
      'test',
    );

    const plan = planner.plan(
      { model: 'tiny-model', input: 'x', max_output_tokens: 1 },
      { remainingUsd: 1, outputField: 'max_output_tokens' },
    );

    expect(plan.estimate.estimatedCostUsd).toBe(0.00000015);
  });

  it('preserves authoritative sub-micro provider cost in events and session state', async () => {
    const events: CaptarEvent[] = [];
    const providerCall = vi.fn(async () => ({
      model: 'tiny-model',
      usage: {
        input_tokens: 1,
        output_tokens: 0,
        cost: 0.00000015,
      },
    }));
    const captar = createCaptar({
      project: 'tiny-provider-cost',
      pricing: [
        {
          provider: 'test',
          model: 'tiny-model',
          inputCostPer1kTokensUsd: 0.00015,
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

    await wrapped.responses.create({
      model: 'tiny-model',
      input: 'x',
      max_output_tokens: 1,
    });

    expect(session.getState().committedUsd).toBe(0.00000015);
    expect(
      events.find((event) => event.type === 'spend.committed')?.data.actualCostUsd,
    ).toBe(0.00000015);
  });

  it('accumulates many tiny wrapped calls into nonzero spend', async () => {
    const providerCall = vi.fn(async () => ({
      model: 'tiny-model',
      usage: {
        input_tokens: 1,
        output_tokens: 0,
        cost: 0.00000015,
      },
    }));
    const captar = createCaptar({
      project: 'tiny-repeated-cost',
      pricing: [
        {
          provider: 'test',
          model: 'tiny-model',
          inputCostPer1kTokensUsd: 0.00015,
          outputCostPer1kTokensUsd: 0,
        },
      ],
      defaultPolicy: { budget: { maxRepeatedCalls: 2000 } },
    });
    const session = await captar.startSession({ budget: { maxSpendUsd: 1 } });
    const wrapped = captar.wrapOpenAI(
      { responses: { create: providerCall } },
      { session, provider: 'test' },
    );

    for (let index = 0; index < 1000; index += 1) {
      await wrapped.responses.create({
        model: 'tiny-model',
        input: `x-${index}`,
        max_output_tokens: 1,
      });
    }

    expect(providerCall).toHaveBeenCalledTimes(1000);
    expect(session.getState().committedUsd).toBe(0.00015);
  });
});
