import { describe, expect, it, vi } from 'vitest';

import { createCaptar } from '../src/index.js';
import { BudgetPlanner } from '../src/internal/budget-planner.js';
import { PricingRegistry } from '../src/internal/pricing-registry.js';

const exactPricing = [
  {
    provider: 'test',
    model: 'budget-model',
    inputCostPer1kTokensUsd: 1,
    outputCostPer1kTokensUsd: 1,
  },
];

describe('BudgetPlanner', () => {
  it('converts remaining USD into an exact Responses output-token ceiling', () => {
    const planner = new BudgetPlanner(new PricingRegistry(exactPricing), 'test');
    const plan = planner.plan(
      { model: 'budget-model', input: 'x' },
      {
        remainingUsd: 0.01,
        outputField: 'max_output_tokens',
      },
    );

    expect(plan.estimate.estimatedInputTokens).toBe(1);
    expect(plan.enforcedOutputTokens).toBe(9);
    expect(plan.request.max_output_tokens).toBe(9);
    expect(plan.estimate.estimatedCostUsd).toBeCloseTo(0.01, 12);
  });

  it('keeps a smaller caller limit instead of increasing it', () => {
    const planner = new BudgetPlanner(new PricingRegistry(exactPricing), 'test');
    const plan = planner.plan(
      { model: 'budget-model', input: 'x', max_output_tokens: 4 },
      {
        remainingUsd: 0.05,
        outputField: 'max_output_tokens',
      },
    );

    expect(plan.enforcedOutputTokens).toBe(4);
    expect(plan.request.max_output_tokens).toBe(4);
  });

  it('protects finalization reserve before calculating affordable output', () => {
    const planner = new BudgetPlanner(new PricingRegistry(exactPricing), 'test');
    const plan = planner.plan(
      { model: 'budget-model', input: 'x' },
      {
        remainingUsd: 0.01,
        protectedReserveUsd: 0.003,
        outputField: 'max_tokens',
      },
    );

    expect(plan.spendableUsd).toBe(0.007);
    expect(plan.enforcedOutputTokens).toBe(6);
    expect(plan.request.max_tokens).toBe(6);
  });

  it('blocks when the conservative input estimate alone cannot fit', () => {
    const planner = new BudgetPlanner(new PricingRegistry(exactPricing), 'test');

    expect(() =>
      planner.plan(
        { model: 'budget-model', input: 'long input' },
        {
          remainingUsd: 0.001,
          outputField: 'max_output_tokens',
        },
      ),
    ).toThrow(/input cost/i);
  });

  it('includes Responses instructions in the conservative input estimate', () => {
    const planner = new BudgetPlanner(new PricingRegistry(exactPricing), 'test');
    const base = planner.plan(
      { model: 'budget-model', input: 'x' },
      { remainingUsd: 1, outputField: 'max_output_tokens' },
    );
    const withInstructions = planner.plan(
      {
        model: 'budget-model',
        input: 'x',
        instructions: 'Be precise. '.repeat(20),
      },
      { remainingUsd: 1, outputField: 'max_output_tokens' },
    );

    expect(withInstructions.estimate.estimatedInputTokens).toBeGreaterThan(
      base.estimate.estimatedInputTokens,
    );
    expect(withInstructions.enforcedOutputTokens).toBeLessThan(base.enforcedOutputTokens!);
  });

  it('includes tool schemas and structured-output schemas in the input estimate', () => {
    const planner = new BudgetPlanner(new PricingRegistry(exactPricing), 'test');
    const base = planner.plan(
      { model: 'budget-model', messages: [{ role: 'user', content: 'x' }] },
      { remainingUsd: 2, outputField: 'max_completion_tokens' },
    );
    const withSchemas = planner.plan(
      {
        model: 'budget-model',
        messages: [{ role: 'user', content: 'x' }],
        tools: [
          {
            type: 'function',
            function: {
              name: 'search',
              description: 'Search a large catalog of records.',
              parameters: {
                type: 'object',
                properties: {
                  query: { type: 'string', description: 'Search query '.repeat(10) },
                },
              },
            },
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'answer',
            schema: {
              type: 'object',
              properties: { answer: { type: 'string' } },
            },
          },
        },
      },
      { remainingUsd: 2, outputField: 'max_completion_tokens' },
    );

    expect(withSchemas.estimate.estimatedInputTokens).toBeGreaterThan(
      base.estimate.estimatedInputTokens,
    );
    expect(withSchemas.enforcedOutputTokens).toBeLessThan(base.enforcedOutputTokens!);
  });

  it('does not count transport-only fields as prompt bytes', () => {
    const planner = new BudgetPlanner(new PricingRegistry(exactPricing), 'test');
    const base = planner.plan(
      { model: 'budget-model', input: 'hello' },
      { remainingUsd: 1, outputField: 'max_output_tokens' },
    );
    const withTransportFields = planner.plan(
      {
        model: 'budget-model',
        input: 'hello',
        stream: true,
        temperature: 0.2,
        max_output_tokens: 10,
      },
      { remainingUsd: 1, outputField: 'max_output_tokens' },
    );

    expect(withTransportFields.estimate.estimatedInputTokens).toBe(
      base.estimate.estimatedInputTokens,
    );
  });

  it('fails closed for unknown pricing before planning', () => {
    const planner = new BudgetPlanner(new PricingRegistry(exactPricing), 'test');

    expect(() =>
      planner.plan(
        { model: 'unknown-model', input: 'x' },
        {
          remainingUsd: 1,
          outputField: 'max_output_tokens',
        },
      ),
    ).toThrow(/No pricing configured/);
  });
});

describe('provider request mutation', () => {
  it('sends the budget-derived Chat Completions ceiling to the provider', async () => {
    const providerCall = vi.fn(async (request: Record<string, unknown>) => ({
      model: 'budget-model',
      usage: { prompt_tokens: 1, completion_tokens: 1 },
      request,
    }));
    const captar = createCaptar({
      project: 'budget-planner-chat',
      pricing: [
        {
          provider: 'test',
          model: 'budget-model',
          inputCostPer1kTokensUsd: 0.001,
          outputCostPer1kTokensUsd: 1,
        },
      ],
    });
    const session = await captar.startSession({ budget: { maxSpendUsd: 0.01 } });
    const wrapped = captar.wrapOpenAI(
      { chat: { completions: { create: providerCall } } },
      { session, provider: 'test' },
    );

    await wrapped.chat.completions.create({
      model: 'budget-model',
      messages: [{ role: 'user', content: 'hello' }],
    });

    expect(providerCall).toHaveBeenCalledOnce();
    const sent = providerCall.mock.calls[0]?.[0];
    expect(sent).toEqual(expect.objectContaining({ max_tokens: expect.any(Number) }));
    expect(Number(sent?.max_tokens)).toBeGreaterThan(0);
    expect(Number(sent?.max_tokens)).toBeLessThan(10);
  });

  it('sends the budget-derived Responses ceiling to the provider', async () => {
    const providerCall = vi.fn(async () => ({
      model: 'budget-model',
      usage: { input_tokens: 1, output_tokens: 1 },
    }));
    const captar = createCaptar({
      project: 'budget-planner-responses',
      pricing: [
        {
          provider: 'test',
          model: 'budget-model',
          inputCostPer1kTokensUsd: 0.001,
          outputCostPer1kTokensUsd: 1,
        },
      ],
    });
    const session = await captar.startSession({ budget: { maxSpendUsd: 0.01 } });
    const wrapped = captar.wrapOpenAI(
      { responses: { create: providerCall } },
      { session, provider: 'test' },
    );

    await wrapped.responses.create({ model: 'budget-model', input: 'hello' });

    expect(providerCall).toHaveBeenCalledOnce();
    expect(providerCall.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({ max_output_tokens: expect.any(Number) }),
    );
  });

  it('blocks before provider execution when instructions consume the remaining budget', async () => {
    const providerCall = vi.fn(async () => ({
      model: 'budget-model',
      usage: { input_tokens: 1, output_tokens: 1 },
    }));
    const captar = createCaptar({
      project: 'budget-planner-expanded-input',
      pricing: exactPricing,
    });
    const session = await captar.startSession({ budget: { maxSpendUsd: 0.02 } });
    const wrapped = captar.wrapOpenAI(
      { responses: { create: providerCall } },
      { session, provider: 'test' },
    );

    await expect(
      wrapped.responses.create({
        model: 'budget-model',
        input: 'x',
        instructions: 'This instruction is deliberately much larger than the available budget.',
      }),
    ).rejects.toThrow(/input cost/i);

    expect(providerCall).not.toHaveBeenCalled();
  });
});
