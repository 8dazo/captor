import { afterEach, describe, expect, it, vi } from 'vitest';

import { createCaptar, type CaptarEvent } from '../src/index.js';
import { HttpBatchExporter } from '../src/internal/exporter.js';

function event(data: Record<string, unknown> = {}): CaptarEvent {
  return {
    id: 'evt_test',
    type: 'request.started',
    timestamp: new Date(0).toISOString(),
    sessionId: 'session_test',
    trace: { traceId: 'trace_test', spanId: 'span_test' },
    data,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('telemetry failure isolation', () => {
  it('returns a successful provider result even when a custom exporter throws', async () => {
    const exporter = {
      export: vi.fn(async () => {
        throw new Error('telemetry backend unavailable');
      }),
    };
    const providerCall = vi.fn(async () => ({
      model: 'telemetry-model',
      usage: { input_tokens: 1, output_tokens: 1, cost: 0 },
    }));
    const captar = createCaptar({
      project: 'telemetry-isolation',
      exporter,
      pricing: [
        {
          provider: 'test',
          model: 'telemetry-model',
          inputCostPer1kTokensUsd: 0,
          outputCostPer1kTokensUsd: 0,
        },
      ],
    });
    const session = await captar.startSession({ budget: { maxSpendUsd: 1 } });
    const wrapped = captar.wrapOpenAI(
      { responses: { create: providerCall } },
      { session, provider: 'test' },
    );

    await expect(
      wrapped.responses.create({ model: 'telemetry-model', input: 'hello' }),
    ).resolves.toEqual(expect.objectContaining({ model: 'telemetry-model' }));
    expect(providerCall).toHaveBeenCalledOnce();
    expect(exporter.export).toHaveBeenCalled();
  });

  it('keeps dispatching listeners when one listener throws', async () => {
    const secondListener = vi.fn();
    const providerCall = vi.fn(async () => ({
      model: 'telemetry-model',
      usage: { input_tokens: 1, output_tokens: 1, cost: 0 },
    }));
    const captar = createCaptar({
      project: 'listener-isolation',
      pricing: [
        {
          provider: 'test',
          model: 'telemetry-model',
          inputCostPer1kTokensUsd: 0,
          outputCostPer1kTokensUsd: 0,
        },
      ],
    });
    captar.onEvent(() => {
      throw new Error('listener crashed');
    });
    captar.onEvent(secondListener);
    const session = await captar.startSession({ budget: { maxSpendUsd: 1 } });
    const wrapped = captar.wrapOpenAI(
      { responses: { create: providerCall } },
      { session, provider: 'test' },
    );

    await expect(
      wrapped.responses.create({ model: 'telemetry-model', input: 'hello' }),
    ).resolves.toBeDefined();
    expect(secondListener).toHaveBeenCalled();
    expect(providerCall).toHaveBeenCalledOnce();
  });
});

describe('HttpBatchExporter recovery', () => {
  it('retains a batch after a thrown network error and sends the same batch on the next flush', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('socket closed'))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ accepted: 1, retryable: false }),
      });
    vi.stubGlobal('fetch', fetchMock);
    const exporter = new HttpBatchExporter({ url: 'https://ingest.test', batchSize: 1 });

    await expect(exporter.enqueue(event())).resolves.toBeUndefined();
    expect(exporter.getPendingEventCount()).toBe(1);
    expect(exporter.getLastError()?.message).toContain('socket closed');

    await expect(exporter.flush()).resolves.toBeUndefined();
    expect(exporter.getPendingEventCount()).toBe(0);
    expect(exporter.getLastError()).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[1]?.body).toBe(fetchMock.mock.calls[0]?.[1]?.body);
  });

  it('retains a 4xx-rejected batch and exposes failure on explicit flush', async () => {
    const rejectedResponse = {
      ok: false,
      status: 401,
      json: async () => ({ accepted: 0, retryable: false }),
    };
    const fetchMock = vi.fn().mockResolvedValue(rejectedResponse);
    vi.stubGlobal('fetch', fetchMock);
    const exporter = new HttpBatchExporter({ url: 'https://ingest.test', batchSize: 1 });

    await expect(exporter.enqueue(event())).resolves.toBeUndefined();
    expect(exporter.getPendingEventCount()).toBe(1);
    expect(exporter.getLastError()?.message).toMatch(/rejected.*non-retryable/i);
    await expect(exporter.flush()).rejects.toThrow(/rejected/);
    expect(exporter.getPendingEventCount()).toBe(1);
    expect(exporter.getLastError()?.message).toMatch(/rejected.*non-retryable/i);
  });

  it('serializes circular objects and bigint values without failing inference telemetry', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ accepted: 1, retryable: false }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const exporter = new HttpBatchExporter({ url: 'https://ingest.test' });
    const circular: Record<string, unknown> = { amount: 7n };
    circular.self = circular;

    await exporter.enqueue(event({ circular }));
    await exporter.flush();

    const body = String(fetchMock.mock.calls[0]?.[1]?.body);
    expect(body).toContain('"amount":"7"');
    expect(body).toContain('[Circular]');
  });
});
