import { afterEach, describe, expect, it, vi } from 'vitest';

import { createCaptar, type CaptarEvent, type ExportBatch, type Exporter } from '../src/index.js';

function noopExporter(): Exporter {
  return {
    async export(batch: ExportBatch) {
      return { accepted: batch.events.length };
    },
  };
}

function okPolicyResponse(
  policy: Record<string, unknown> = {},
  policyVersion = 11,
  payloadRetention = 'NONE',
): Response {
  return new Response(
    JSON.stringify({
      hook: {
        id: 'hook_sync',
        policy,
        policyVersion,
        payloadRetention,
      },
    }),
    {
      status: 200,
      headers: { 'content-type': 'application/json' },
    },
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('control-plane sync availability', () => {
  it('keeps syncPolicy=true backward-compatible as required mode on HTTP failure', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('missing', { status: 404 })));
    const captar = createCaptar({
      project: 'required-404',
      exporter: noopExporter(),
      controlPlane: {
        hookId: 'hook_sync',
        baseUrl: 'https://control.example',
        syncPolicy: true,
      },
    });

    await expect(captar.startSession()).rejects.toThrow(/HTTP 404/);
  });

  it('fails required mode on network failure', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('network down');
    }));
    const captar = createCaptar({
      project: 'required-network',
      exporter: noopExporter(),
      controlPlane: {
        hookId: 'hook_sync',
        baseUrl: 'https://control.example',
        syncMode: 'required',
      },
    });

    await expect(captar.startSession()).rejects.toThrow(/request failed/i);
  });

  it('fails required mode deterministically when the independent sync timeout aborts fetch', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_input: unknown, init?: RequestInit) =>
        await new Promise<Response>((_resolve, reject) => {
          const signal = init?.signal;
          if (!signal) {
            reject(new Error('expected abort signal'));
            return;
          }
          if (signal.aborted) {
            reject(signal.reason);
            return;
          }
          signal.addEventListener('abort', () => reject(signal.reason), { once: true });
        }),
      ),
    );
    const captar = createCaptar({
      project: 'required-timeout',
      exporter: noopExporter(),
      controlPlane: {
        hookId: 'hook_sync',
        baseUrl: 'https://control.example',
        syncMode: 'required',
        syncTimeoutMs: 5,
      },
    });

    await expect(captar.startSession()).rejects.toThrow(/timed out after 5ms/i);
  });

  it('reuses a fresh versioned cached policy and exposes remote/cache source metadata', async () => {
    const fetchMock = vi.fn(async () =>
      okPolicyResponse({ call: { maxCallsPerSession: 3 } }, 42, 'REDACTED'),
    );
    vi.stubGlobal('fetch', fetchMock);
    const captar = createCaptar({
      project: 'cached-policy',
      exporter: noopExporter(),
      controlPlane: {
        hookId: 'hook_sync',
        baseUrl: 'https://control.example',
        syncMode: 'cached',
        cacheTtlMs: 60_000,
      },
    });

    const first = await captar.startSession();
    const second = await captar.startSession();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(first.metadata?._captarPolicySource).toBe('remote');
    expect(first.metadata?._captarPolicyVersion).toBe(42);
    expect(first.metadata?._captarPayloadRetention).toBe('redacted');
    expect(second.metadata?._captarPolicySource).toBe('cache');
    expect(second.metadata?._captarPolicyVersion).toBe(42);
    expect(second.policy?.call?.maxCallsPerSession).toBe(3);
  });

  it('best-effort falls back to local policy when the control plane is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('offline');
    }));
    const events: CaptarEvent[] = [];
    const providerCall = vi.fn(async () => ({
      model: 'gpt-4.1-mini',
      usage: { input_tokens: 1, output_tokens: 1 },
    }));
    const captar = createCaptar({
      project: 'best-effort-local',
      exporter: noopExporter(),
      controlPlane: {
        hookId: 'hook_sync',
        baseUrl: 'https://control.example',
        syncMode: 'best-effort',
      },
    });
    captar.onEvent((event) => events.push(event));
    const session = await captar.startSession({ budget: { maxSpendUsd: 0 } });
    const wrapped = captar.wrapOpenAI(
      { responses: { create: providerCall } },
      { session },
    );

    expect(session.metadata?._captarPolicySource).toBe('local');
    await expect(
      wrapped.responses.create({
        model: 'gpt-4.1-mini',
        input: 'still locally governed',
        max_output_tokens: 1,
      }),
    ).rejects.toThrow(/budget|spend|remaining/i);
    expect(providerCall).not.toHaveBeenCalled();
    expect(events.some((event) => event.type === 'request.blocked')).toBe(true);
  });

  it('best-effort does not swallow a malformed successful control-plane response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => okPolicyResponse({}, 1, 'UNKNOWN_MODE')));
    const captar = createCaptar({
      project: 'best-effort-invalid',
      exporter: noopExporter(),
      controlPlane: {
        hookId: 'hook_sync',
        baseUrl: 'https://control.example',
        syncMode: 'best-effort',
      },
    });

    await expect(captar.startSession()).rejects.toThrow(/payloadRetention/i);
  });

  it('rejects contradictory disabled sync plus an explicit mode', () => {
    expect(() =>
      createCaptar({
        project: 'invalid-sync-config',
        exporter: noopExporter(),
        controlPlane: {
          hookId: 'hook_sync',
          syncPolicy: false,
          syncMode: 'cached',
        },
      }),
    ).toThrow(/cannot be combined/);
  });
});

describe('CAPTAR_TIMEOUT_MS runtime default', () => {
  it('applies a valid env timeout to the effective default call policy', async () => {
    vi.stubEnv('CAPTAR_TIMEOUT_MS', '1234');
    const captar = createCaptar({
      project: 'env-timeout',
      exporter: noopExporter(),
    });

    const session = await captar.startSession();
    expect(session.policy?.call?.timeoutMs).toBe(1234);
  });

  it('lets explicit defaultPolicy override the environment default', async () => {
    vi.stubEnv('CAPTAR_TIMEOUT_MS', '1234');
    const captar = createCaptar({
      project: 'explicit-timeout',
      exporter: noopExporter(),
      defaultPolicy: { call: { timeoutMs: 4321 } },
    });

    const session = await captar.startSession();
    expect(session.policy?.call?.timeoutMs).toBe(4321);
  });
});
