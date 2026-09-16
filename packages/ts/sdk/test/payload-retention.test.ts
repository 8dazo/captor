import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createCaptar,
  type CaptarEvent,
  type ExportBatch,
  type Exporter,
} from '../src/index.js';

function stubControlPlane(
  payloadRetention: unknown,
  policy: Record<string, unknown> = {},
  policyVersion: number | null = 7,
) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      new Response(
        JSON.stringify({
          hook: {
            id: 'hook_privacy',
            payloadRetention,
            policy,
            policyVersion,
          },
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        },
      ),
    ),
  );
}

function captureExporter(events: CaptarEvent[]): Exporter {
  return {
    async export(batch: ExportBatch) {
      events.push(...batch.events);
      return { accepted: batch.events.length };
    },
  };
}

function responseWithSecret(secret: string) {
  return {
    model: 'gpt-4.1-mini',
    output: [
      {
        type: 'message',
        content: [{ type: 'output_text', text: secret }],
      },
    ],
    usage: {
      input_tokens: 1,
      output_tokens: 1,
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('client-side payload retention', () => {
  it('omits raw request/response payloads from listeners and exporters in NONE mode', async () => {
    stubControlPlane('NONE');
    const listenerEvents: CaptarEvent[] = [];
    const exportedEvents: CaptarEvent[] = [];
    const requestSecret = 'request-secret-none';
    const responseSecret = 'response-secret-none';
    const providerCall = vi.fn(async () => responseWithSecret(responseSecret));
    const captar = createCaptar({
      project: 'retention-none',
      exporter: captureExporter(exportedEvents),
      controlPlane: {
        hookId: 'hook_privacy',
        baseUrl: 'https://control.example',
        syncPolicy: true,
      },
    });
    captar.onEvent((event) => listenerEvents.push(event));
    const session = await captar.startSession({ budget: { maxSpendUsd: 1 } });
    const wrapped = captar.wrapOpenAI(
      { responses: { create: providerCall } },
      { session },
    );

    const response = await wrapped.responses.create({
      model: 'gpt-4.1-mini',
      input: requestSecret,
      max_output_tokens: 1,
    });

    expect(providerCall.mock.calls[0]?.[0].input).toBe(requestSecret);
    expect(response.output[0].content[0].text).toBe(responseSecret);

    const requestEvent = listenerEvents.find((event) => event.type === 'request.started');
    const responseEvent = listenerEvents.find((event) => event.type === 'provider.response');
    expect(requestEvent).toBeDefined();
    expect(responseEvent).toBeDefined();
    expect('request' in (requestEvent?.data ?? {})).toBe(false);
    expect('response' in (responseEvent?.data ?? {})).toBe(false);
    expect(requestEvent?.data.model).toBe('gpt-4.1-mini');
    expect(responseEvent?.data.model).toBe('gpt-4.1-mini');
    expect(session.metadata?._captarPayloadRetention).toBe('none');
    expect(session.metadata?._captarPolicyVersion).toBe(7);

    expect(JSON.stringify(listenerEvents)).not.toContain(requestSecret);
    expect(JSON.stringify(listenerEvents)).not.toContain(responseSecret);
    expect(JSON.stringify(exportedEvents)).not.toContain(requestSecret);
    expect(JSON.stringify(exportedEvents)).not.toContain(responseSecret);
  });

  it('redacts scalar payload values before both telemetry surfaces while preserving structure', async () => {
    stubControlPlane('REDACTED');
    const listenerEvents: CaptarEvent[] = [];
    const exportedEvents: CaptarEvent[] = [];
    const requestSecret = 'request-secret-redacted';
    const responseSecret = 'response-secret-redacted';
    const providerCall = vi.fn(async () => responseWithSecret(responseSecret));
    const captar = createCaptar({
      project: 'retention-redacted',
      exporter: captureExporter(exportedEvents),
      controlPlane: {
        hookId: 'hook_privacy',
        baseUrl: 'https://control.example',
        syncPolicy: true,
      },
    });
    captar.onEvent((event) => listenerEvents.push(event));
    const session = await captar.startSession({ budget: { maxSpendUsd: 1 } });
    const wrapped = captar.wrapOpenAI(
      { responses: { create: providerCall } },
      { session },
    );

    const response = await wrapped.responses.create({
      model: 'gpt-4.1-mini',
      input: requestSecret,
      metadata: { customer: 'customer-42' },
      max_output_tokens: 1,
    });

    expect(providerCall.mock.calls[0]?.[0].input).toBe(requestSecret);
    expect(response.output[0].content[0].text).toBe(responseSecret);

    const requestEvent = listenerEvents.find((event) => event.type === 'request.started');
    const responseEvent = listenerEvents.find((event) => event.type === 'provider.response');
    const retainedRequest = requestEvent?.data.request as Record<string, unknown>;
    const retainedResponse = responseEvent?.data.response as Record<string, unknown>;
    expect(retainedRequest).toEqual(
      expect.objectContaining({
        model: '[REDACTED]',
        input: '[REDACTED]',
        max_output_tokens: '[REDACTED]',
        metadata: { customer: '[REDACTED]' },
      }),
    );
    expect(retainedResponse.model).toBe('[REDACTED]');
    expect(Array.isArray(retainedResponse.output)).toBe(true);
    expect(requestEvent?.data.model).toBe('gpt-4.1-mini');
    expect(responseEvent?.data.inputTokens).toBe(1);
    expect(responseEvent?.data.outputTokens).toBe(1);

    expect(JSON.stringify(listenerEvents)).not.toContain(requestSecret);
    expect(JSON.stringify(listenerEvents)).not.toContain(responseSecret);
    expect(JSON.stringify(listenerEvents)).not.toContain('customer-42');
    expect(JSON.stringify(exportedEvents)).not.toContain(requestSecret);
    expect(JSON.stringify(exportedEvents)).not.toContain(responseSecret);
  });

  it('preserves raw payload telemetry only when the synced hook explicitly selects RAW', async () => {
    stubControlPlane('RAW');
    const listenerEvents: CaptarEvent[] = [];
    const requestSecret = 'request-secret-raw';
    const responseSecret = 'response-secret-raw';
    const captar = createCaptar({
      project: 'retention-raw',
      exporter: captureExporter([]),
      controlPlane: {
        hookId: 'hook_privacy',
        baseUrl: 'https://control.example',
        syncPolicy: true,
      },
    });
    captar.onEvent((event) => listenerEvents.push(event));
    const session = await captar.startSession({ budget: { maxSpendUsd: 1 } });
    const wrapped = captar.wrapOpenAI(
      { responses: { create: vi.fn(async () => responseWithSecret(responseSecret)) } },
      { session },
    );

    await wrapped.responses.create({
      model: 'gpt-4.1-mini',
      input: requestSecret,
      max_output_tokens: 1,
    });

    expect(JSON.stringify(listenerEvents)).toContain(requestSecret);
    expect(JSON.stringify(listenerEvents)).toContain(responseSecret);
    expect(session.metadata?._captarPayloadRetention).toBe('raw');
  });

  it('keeps remote policy enforcement identical when payload capture is disabled', async () => {
    stubControlPlane('NONE', {
      call: { blockedModels: ['gpt-4.1-mini'] },
    });
    const listenerEvents: CaptarEvent[] = [];
    const providerCall = vi.fn(async () => responseWithSecret('never-returned'));
    const captar = createCaptar({
      project: 'retention-policy',
      exporter: captureExporter([]),
      controlPlane: {
        hookId: 'hook_privacy',
        baseUrl: 'https://control.example',
        syncPolicy: true,
      },
    });
    captar.onEvent((event) => listenerEvents.push(event));
    const session = await captar.startSession({ budget: { maxSpendUsd: 1 } });
    const wrapped = captar.wrapOpenAI(
      { responses: { create: providerCall } },
      { session },
    );

    await expect(
      wrapped.responses.create({
        model: 'gpt-4.1-mini',
        input: 'sensitive blocked prompt',
        max_output_tokens: 1,
      }),
    ).rejects.toThrow(/blocked by policy/i);

    expect(providerCall).not.toHaveBeenCalled();
    expect(listenerEvents.some((event) => event.type === 'request.blocked')).toBe(true);
    expect(JSON.stringify(listenerEvents)).not.toContain('sensitive blocked prompt');
  });

  it('fails closed when a synced control plane returns an unknown retention mode', async () => {
    stubControlPlane('FUTURE_MODE');
    const captar = createCaptar({
      project: 'retention-invalid',
      exporter: captureExporter([]),
      controlPlane: {
        hookId: 'hook_privacy',
        baseUrl: 'https://control.example',
        syncPolicy: true,
      },
    });

    await expect(captar.startSession()).rejects.toThrow(/payloadRetention/i);
  });
});
