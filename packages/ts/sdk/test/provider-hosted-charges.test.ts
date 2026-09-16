import { describe, expect, it, vi } from 'vitest';

import { createCaptar, type CaptarEvent } from '../src/index.js';

const zeroPricing = [
  {
    provider: 'test',
    model: 'hosted-model',
    inputCostPer1kTokensUsd: 0,
    outputCostPer1kTokensUsd: 0,
  },
];

function usageResponse(cost?: number) {
  return {
    model: 'hosted-model',
    usage: {
      input_tokens: 1,
      output_tokens: 1,
      ...(typeof cost === 'number' ? { cost } : {}),
    },
  };
}

describe('provider-hosted non-token charges', () => {
  it('reserves a conservative hosted-tool ceiling and keeps it in local reconciliation', async () => {
    const events: CaptarEvent[] = [];
    const providerCall = vi.fn(async () => usageResponse());
    const captar = createCaptar({ project: 'hosted-charge-reservation', pricing: zeroPricing });
    captar.onEvent((event) => events.push(event));
    const session = await captar.startSession({ budget: { maxSpendUsd: 0.05 } });
    const wrapped = captar.wrapOpenAI(
      { responses: { create: providerCall } },
      {
        session,
        provider: 'test',
        providerToolCostsUsd: { web_search: 0.01 },
      },
    );

    await wrapped.responses.create({
      model: 'hosted-model',
      input: 'search',
      tools: [{ type: 'web_search' }],
      max_tool_calls: 2,
      max_output_tokens: 1,
    });

    expect(providerCall).toHaveBeenCalledOnce();
    const sent = providerCall.mock.calls[0]?.[0] as Record<PropertyKey, unknown>;
    expect(Reflect.ownKeys(sent).filter((key) => typeof key === 'symbol')).toHaveLength(0);
    expect(session.getState().committedUsd).toBeCloseTo(0.02, 10);
    expect(session.getState().reservedUsd).toBe(0);
    expect(
      events.find((event) => event.type === 'estimate.reserved')?.data.reservedUsd,
    ).toBeCloseTo(0.02, 10);
    expect(events.find((event) => event.type === 'provider.response')?.data).toEqual(
      expect.objectContaining({
        costSource: 'conservative_estimate',
        costConfidence: 'upper_bound',
        providerHostedChargeEstimateUsd: 0.02,
      }),
    );
  });

  it('uses the most expensive available hosted tool for a total max_tool_calls ceiling', async () => {
    const providerCall = vi.fn(async () => usageResponse());
    const captar = createCaptar({ project: 'hosted-charge-max-unit', pricing: zeroPricing });
    const session = await captar.startSession({ budget: { maxSpendUsd: 0.1 } });
    const wrapped = captar.wrapOpenAI(
      { responses: { create: providerCall } },
      {
        session,
        provider: 'test',
        providerToolCostsUsd: {
          web_search: 0.01,
          file_search: 0.02,
        },
      },
    );

    await wrapped.responses.create({
      model: 'hosted-model',
      input: 'use whichever hosted tool is needed',
      tools: [{ type: 'web_search' }, { type: 'file_search' }],
      max_tool_calls: 3,
      max_output_tokens: 1,
    });

    expect(session.getState().committedUsd).toBeCloseTo(0.06, 10);
  });

  it('fails closed on unknown hosted-tool pricing under a finite USD budget', async () => {
    const providerCall = vi.fn(async () => usageResponse());
    const captar = createCaptar({ project: 'hosted-charge-unknown', pricing: zeroPricing });
    const session = await captar.startSession({ budget: { maxSpendUsd: 1 } });
    const wrapped = captar.wrapOpenAI(
      { responses: { create: providerCall } },
      { session, provider: 'test' },
    );

    await expect(
      wrapped.responses.create({
        model: 'hosted-model',
        input: 'search',
        tools: [{ type: 'web_search' }],
        max_tool_calls: 1,
      }),
    ).rejects.toThrow(/No provider-hosted tool pricing configured.*web_search/i);
    expect(providerCall).not.toHaveBeenCalled();
  });

  it('requires max_tool_calls for positive hosted-tool prices under a finite budget', async () => {
    const providerCall = vi.fn(async () => usageResponse());
    const captar = createCaptar({ project: 'hosted-charge-ceiling', pricing: zeroPricing });
    const session = await captar.startSession({ budget: { maxSpendUsd: 1 } });
    const wrapped = captar.wrapOpenAI(
      { responses: { create: providerCall } },
      {
        session,
        provider: 'test',
        providerToolCostsUsd: { web_search: 0.01 },
      },
    );

    await expect(
      wrapped.responses.create({
        model: 'hosted-model',
        input: 'search',
        tools: [{ type: 'web_search' }],
      }),
    ).rejects.toThrow(/requires request\.max_tool_calls/i);
    expect(providerCall).not.toHaveBeenCalled();
  });

  it('blocks before execution when the hosted-tool ceiling alone exceeds the hard budget', async () => {
    const providerCall = vi.fn(async () => usageResponse());
    const captar = createCaptar({ project: 'hosted-charge-over-budget', pricing: zeroPricing });
    const session = await captar.startSession({ budget: { maxSpendUsd: 0.05 } });
    const wrapped = captar.wrapOpenAI(
      { responses: { create: providerCall } },
      {
        session,
        provider: 'test',
        providerToolCostsUsd: { web_search: 0.03 },
      },
    );

    await expect(
      wrapped.responses.create({
        model: 'hosted-model',
        input: 'search',
        tools: [{ type: 'web_search' }],
        max_tool_calls: 2,
      }),
    ).rejects.toThrow(/Provider-hosted tool reservation.*exceeds/i);
    expect(providerCall).not.toHaveBeenCalled();
  });

  it('lets authoritative provider usage.cost replace the conservative reservation', async () => {
    const events: CaptarEvent[] = [];
    const providerCall = vi.fn(async () => usageResponse(0.012));
    const captar = createCaptar({ project: 'hosted-charge-provider-cost', pricing: zeroPricing });
    captar.onEvent((event) => events.push(event));
    const session = await captar.startSession({ budget: { maxSpendUsd: 0.05 } });
    const wrapped = captar.wrapOpenAI(
      { responses: { create: providerCall } },
      {
        session,
        provider: 'test',
        providerToolCostsUsd: { web_search: 0.01 },
      },
    );

    await wrapped.responses.create({
      model: 'hosted-model',
      input: 'search',
      tools: [{ type: 'web_search' }],
      max_tool_calls: 2,
      max_output_tokens: 1,
    });

    expect(session.getState().committedUsd).toBeCloseTo(0.012, 10);
    expect(session.getSummary().totalReleasedUsd).toBeCloseTo(0.008, 10);
    expect(events.find((event) => event.type === 'provider.response')?.data).toEqual(
      expect.objectContaining({
        costSource: 'provider',
        costConfidence: 'authoritative',
        providerHostedChargeEstimateUsd: 0.02,
      }),
    );
  });

  it('does not treat local function/custom tools as provider-hosted charges', async () => {
    const providerCall = vi.fn(async () => usageResponse());
    const captar = createCaptar({ project: 'local-tools-not-hosted', pricing: zeroPricing });
    const session = await captar.startSession({ budget: { maxSpendUsd: 0.01 } });
    const wrapped = captar.wrapOpenAI(
      { responses: { create: providerCall } },
      { session, provider: 'test' },
    );

    await expect(
      wrapped.responses.create({
        model: 'hosted-model',
        input: 'call my function',
        tools: [
          { type: 'function', name: 'lookup' },
          { type: 'custom', name: 'local_custom' },
        ],
      }),
    ).resolves.toBeDefined();
    expect(providerCall).toHaveBeenCalledOnce();
    expect(session.getState().committedUsd).toBe(0);
  });

  it('supports explicitly configured zero-cost hosted tools without a tool-call ceiling', async () => {
    const providerCall = vi.fn(async () => usageResponse());
    const captar = createCaptar({ project: 'free-hosted-tool', pricing: zeroPricing });
    const session = await captar.startSession({ budget: { maxSpendUsd: 0.01 } });
    const wrapped = captar.wrapOpenAI(
      { responses: { create: providerCall } },
      {
        session,
        provider: 'test',
        providerToolCostsUsd: { file_search: 0 },
      },
    );

    await expect(
      wrapped.responses.create({
        model: 'hosted-model',
        input: 'search files',
        tools: [{ type: 'file_search' }],
      }),
    ).resolves.toBeDefined();
    expect(providerCall).toHaveBeenCalledOnce();
  });

  it('rejects invalid hosted-tool price configuration at wrapper construction', async () => {
    const captar = createCaptar({ project: 'invalid-hosted-tool-price', pricing: zeroPricing });
    const session = await captar.startSession({ budget: { maxSpendUsd: 1 } });

    expect(() =>
      captar.wrapOpenAI(
        { responses: { create: vi.fn(async () => usageResponse()) } },
        {
          session,
          provider: 'test',
          providerToolCostsUsd: { web_search: -0.01 },
        },
      ),
    ).toThrow(/finite non-negative USD value/i);
  });
});
