import { describe, expect, it, vi } from 'vitest';

import { OPENAI_PRICING_SNAPSHOT_VERSION } from '@captar/config';

import { createCaptar, type CaptarEvent } from '../src/index.js';
import { BudgetPlanner } from '../src/internal/budget-planner.js';
import { calculatePricingCost } from '../src/internal/pricing-calculator.js';
import { PricingRegistry } from '../src/internal/pricing-registry.js';

function event(events: CaptarEvent[], type: CaptarEvent['type']) {
  return events.find((candidate) => candidate.type === type);
}

describe('versioned built-in OpenAI pricing', () => {
  it('resolves the current GPT-5.6 alias and GPT-6 Astra entries', () => {
    const registry = new PricingRegistry();
    const solAlias = registry.resolve('openai', 'gpt-5.6');
    const astra = registry.resolve('openai', 'gpt-6-astra');

    expect(solAlias?.entry.inputCostPer1kTokensUsd).toBe(0.004);
    expect(solAlias?.entry.cachedInputCostPer1kTokensUsd).toBe(0.0004);
    expect(solAlias?.entry.outputCostPer1kTokensUsd).toBe(0.02);
    expect(solAlias?.rule?.cacheWriteCostPer1kTokensUsd).toBe(0.005);
    expect(astra?.entry.inputCostPer1kTokensUsd).toBe(0.01);
    expect(astra?.rule?.cacheWriteCostPer1kTokensUsd).toBe(0.0125);
    expect(astra?.pricingVersion).toBe(OPENAI_PRICING_SNAPSHOT_VERSION);
    expect(astra?.pricingSource).toContain('developers.openai.com');
  });

  it('applies the >272K long-context multipliers to input/cache and output', () => {
    const pricing = new PricingRegistry().resolve('openai', 'gpt-6-astra');
    expect(pricing).toBeDefined();
    const calculation = calculatePricingCost(pricing!, {
      inputTokens: 272_001,
      cachedInputTokens: 0,
      cacheWriteTokens: 0,
      outputTokens: 1_000,
    });

    expect(calculation.longContextMultiplierApplied).toBe(true);
    expect(calculation.costUsd).toBeCloseTo(5.51502, 8);
  });

  it('prices provider-reported cache writes separately from cache hits and ordinary input', async () => {
    const events: CaptarEvent[] = [];
    const captar = createCaptar({ project: 'cache-write-pricing' });
    captar.onEvent((candidate) => events.push(candidate));
    const session = await captar.startSession({ budget: { maxSpendUsd: 10 } });
    const wrapped = captar.wrapOpenAI(
      {
        responses: {
          create: vi.fn(async () => ({
            model: 'gpt-6-astra',
            usage: {
              input_tokens: 1_000,
              input_tokens_details: {
                cached_tokens: 100,
                cache_write_tokens: 400,
              },
              output_tokens: 100,
            },
          })),
        },
      },
      { session },
    );

    await wrapped.responses.create({
      model: 'gpt-6-astra',
      input: 'hello',
      max_output_tokens: 1,
    });

    const response = event(events, 'provider.response');
    expect(response?.data.cacheWriteTokens).toBe(400);
    expect(response?.data.actualCostUsd ?? response?.data.costUsd).toBeCloseTo(0.0151, 8);
    expect(response?.data.costSource).toBe('local_calculation');
  });

  it('uses a conservative cache-write upper bound when usage omits write detail', async () => {
    const events: CaptarEvent[] = [];
    const captar = createCaptar({ project: 'cache-write-upper-bound' });
    captar.onEvent((candidate) => events.push(candidate));
    const session = await captar.startSession({ budget: { maxSpendUsd: 10 } });
    const wrapped = captar.wrapOpenAI(
      {
        responses: {
          create: vi.fn(async () => ({
            model: 'gpt-5.6-luna',
            usage: { input_tokens: 1_000, output_tokens: 0 },
          })),
        },
      },
      { session },
    );

    await wrapped.responses.create({
      model: 'gpt-5.6-luna',
      input: 'hello',
      max_output_tokens: 1,
    });

    const response = event(events, 'provider.response');
    expect(response?.data.pricingConservative).toBe(true);
    expect(response?.data.costSource).toBe('conservative_estimate');
    expect(response?.data.costUsd).toBeCloseTo(0.00025, 10);
  });

  it('propagates pricing version/source through estimate, response, and spend events', async () => {
    const events: CaptarEvent[] = [];
    const captar = createCaptar({ project: 'pricing-provenance' });
    captar.onEvent((candidate) => events.push(candidate));
    const session = await captar.startSession({ budget: { maxSpendUsd: 10 } });
    const wrapped = captar.wrapOpenAI(
      {
        responses: {
          create: vi.fn(async () => ({
            model: 'gpt-5.6',
            usage: {
              input_tokens: 10,
              input_tokens_details: { cached_tokens: 0, cache_write_tokens: 0 },
              output_tokens: 2,
            },
          })),
        },
      },
      { session },
    );

    await wrapped.responses.create({
      model: 'gpt-5.6',
      input: 'hello',
      max_output_tokens: 2,
    });

    for (const type of ['request.allowed', 'estimate.reserved', 'provider.response', 'spend.committed'] as const) {
      expect(event(events, type)?.data.pricingVersion).toBe(OPENAI_PRICING_SNAPSHOT_VERSION);
      expect(event(events, type)?.data.pricingSource).toContain('developers.openai.com');
    }
  });

  it('marks overridden built-in pricing provenance instead of claiming the stock snapshot', async () => {
    const events: CaptarEvent[] = [];
    const captar = createCaptar({
      project: 'pricing-override-provenance',
      pricingOverrides: [
        {
          provider: 'openai',
          model: 'gpt-5.6-luna',
          inputCostPer1kTokensUsd: 0.0003,
        },
      ],
    });
    captar.onEvent((candidate) => events.push(candidate));
    const session = await captar.startSession({ budget: { maxSpendUsd: 10 } });
    const wrapped = captar.wrapOpenAI(
      {
        responses: {
          create: vi.fn(async () => ({
            model: 'gpt-5.6-luna',
            usage: {
              input_tokens: 1,
              input_tokens_details: { cache_write_tokens: 0 },
              output_tokens: 1,
            },
          })),
        },
      },
      { session },
    );

    await wrapped.responses.create({
      model: 'gpt-5.6-luna',
      input: 'x',
      max_output_tokens: 1,
    });

    expect(event(events, 'request.allowed')?.data.pricingSource).toBe('custom_override');
    expect(event(events, 'request.allowed')?.data.pricingVersion).toBe(
      `${OPENAI_PRICING_SNAPSHOT_VERSION}+custom`,
    );
  });

  it('keeps unknown models fail-closed', async () => {
    const providerCall = vi.fn(async () => ({ model: 'gpt-future-unknown' }));
    const captar = createCaptar({ project: 'unknown-pricing' });
    const session = await captar.startSession({ budget: { maxSpendUsd: 10 } });
    const wrapped = captar.wrapOpenAI(
      { responses: { create: providerCall } },
      { session },
    );

    await expect(
      wrapped.responses.create({
        model: 'gpt-future-unknown',
        input: 'hello',
        max_output_tokens: 1,
      }),
    ).rejects.toThrow(/No pricing configured/);
    expect(providerCall).not.toHaveBeenCalled();
  });

  it('fails closed for explicit non-standard service tiers that local prices cannot prove', async () => {
    const providerCall = vi.fn(async () => ({ model: 'gpt-6-astra' }));
    const captar = createCaptar({ project: 'service-tier-pricing' });
    const session = await captar.startSession({ budget: { maxSpendUsd: 10 } });
    const wrapped = captar.wrapOpenAI(
      { responses: { create: providerCall } },
      { session },
    );

    await expect(
      wrapped.responses.create({
        model: 'gpt-6-astra',
        input: 'hello',
        max_output_tokens: 1,
        service_tier: 'fast',
      }),
    ).rejects.toThrow(/service_tier/);
    expect(providerCall).not.toHaveBeenCalled();
  });

  it('uses the conservative cache-write rate during hard-budget preflight', () => {
    const planner = new BudgetPlanner(new PricingRegistry(), 'openai');
    const plan = planner.plan(
      {
        model: 'gpt-6-astra',
        input: 'x'.repeat(1000),
        max_output_tokens: 1,
      },
      {
        remainingUsd: 10,
        outputField: 'max_output_tokens',
      },
    );

    expect(plan.estimate.pricingConservative).toBe(true);
    expect(plan.estimate.estimatedCostUsd).toBeGreaterThan(0.0125);
  });
});
