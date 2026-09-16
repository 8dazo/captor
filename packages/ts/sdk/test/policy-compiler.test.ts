import { afterEach, describe, expect, it, vi } from 'vitest';

import { createCaptar } from '../src/index.js';
import {
  restrictPolicy,
  validateSessionPolicy,
} from '../src/internal/policy-compiler.js';

const zeroPricing = [
  {
    provider: 'test',
    model: 'policy-model',
    inputCostPer1kTokensUsd: 0,
    outputCostPer1kTokensUsd: 0,
  },
];

function stubRemotePolicy(policy: Record<string, unknown>): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        hook: {
          id: 'hook_test',
          payloadRetention: 'redacted',
          policy,
          policyVersion: 1,
        },
      }),
    })),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('policy validation', () => {
  it.each([
    [{ budget: { maxSpendUsd: Number.NaN } }, /maxSpendUsd/],
    [{ budget: { maxSpendUsd: -1 } }, /maxSpendUsd/],
    [{ budget: { softLimitPct: 1.1 } }, /softLimitPct/],
    [{ call: { maxCallsPerSession: 1.5 } }, /maxCallsPerSession/],
    [{ call: { timeoutMs: 0 } }, /timeoutMs/],
    [{ tool: { maxCallsPerSession: Number.POSITIVE_INFINITY } }, /maxCallsPerSession/],
  ])('rejects malformed hard-control configuration %#', (policy, message) => {
    expect(() => validateSessionPolicy(policy, 'test policy')).toThrow(message);
  });

  it('rejects a finalization reserve larger than the hard budget', () => {
    expect(() =>
      validateSessionPolicy(
        { budget: { maxSpendUsd: 1, finalizationReserveUsd: 1.01 } },
        'test policy',
      ),
    ).toThrow(/cannot exceed maxSpendUsd/);
  });
});

describe('restrictive merge semantics', () => {
  it('uses minimum ceilings, allowlist intersections and blocklist/approval unions', () => {
    const merged = restrictPolicy(
      {
        budget: { maxSpendUsd: 10, maxRepeatedCalls: 5 },
        call: {
          allowedModels: ['a', 'b'],
          blockedModels: ['x'],
          maxCallsPerSession: 10,
        },
        tool: {
          allowedTools: ['search', 'write'],
          blockedTools: ['shell'],
          requireApprovalFor: ['write'],
        },
      },
      {
        budget: { maxSpendUsd: 2, maxRepeatedCalls: 3 },
        call: {
          allowedModels: ['b', 'c'],
          blockedModels: ['y'],
          maxCallsPerSession: 4,
        },
        tool: {
          allowedTools: ['search'],
          blockedTools: ['delete'],
          requireApprovalFor: ['search'],
        },
      },
    );

    expect(merged).toEqual(
      expect.objectContaining({
        budget: expect.objectContaining({ maxSpendUsd: 2, maxRepeatedCalls: 3 }),
        call: expect.objectContaining({
          allowedModels: ['b'],
          blockedModels: ['x', 'y'],
          maxCallsPerSession: 4,
        }),
        tool: expect.objectContaining({
          allowedTools: ['search'],
          blockedTools: ['shell', 'delete'],
          requireApprovalFor: ['write', 'search'],
        }),
      }),
    );
  });
});

describe('remote policy authority', () => {
  it('does not allow session or wrapper options to raise a remote spend/call ceiling', async () => {
    stubRemotePolicy({
      budget: { maxSpendUsd: 0.1 },
      call: { maxCallsPerSession: 1 },
    });
    const providerCall = vi.fn(async () => ({
      model: 'policy-model',
      usage: { input_tokens: 1, output_tokens: 1, cost: 0 },
    }));
    const captar = createCaptar({
      project: 'remote-authority',
      pricing: zeroPricing,
      controlPlane: {
        hookId: 'hook_test',
        baseUrl: 'https://control.test',
        syncPolicy: true,
      },
    });
    const session = await captar.startSession({
      budget: { maxSpendUsd: 10 },
      policy: { call: { maxCallsPerSession: 99 } },
    });
    const wrapped = captar.wrapOpenAI(
      { responses: { create: providerCall } },
      {
        session,
        provider: 'test',
        policy: { call: { maxCallsPerSession: 1000 } },
      },
    );

    expect(session.budget.maxSpendUsd).toBe(0.1);
    await expect(
      wrapped.responses.create({ model: 'policy-model', input: 'first' }),
    ).resolves.toBeDefined();
    await expect(
      wrapped.responses.create({ model: 'policy-model', input: 'second' }),
    ).rejects.toThrow(/maxCallsPerSession=1/);
    expect(providerCall).toHaveBeenCalledOnce();
  });

  it('keeps a remote blocklist even when local policy attempts to allow the model', async () => {
    stubRemotePolicy({ call: { blockedModels: ['policy-model'] } });
    const providerCall = vi.fn(async () => ({ model: 'policy-model' }));
    const captar = createCaptar({
      project: 'remote-blocklist',
      pricing: zeroPricing,
      controlPlane: {
        hookId: 'hook_test',
        baseUrl: 'https://control.test',
        syncPolicy: true,
      },
    });
    const session = await captar.startSession({
      policy: { call: { allowedModels: ['policy-model'] } },
    });
    const wrapped = captar.wrapOpenAI(
      { responses: { create: providerCall } },
      { session, provider: 'test', policy: { call: { allowedModels: ['policy-model'] } } },
    );

    await expect(
      wrapped.responses.create({ model: 'policy-model', input: 'blocked' }),
    ).rejects.toThrow(/blocked by policy/);
    expect(providerCall).not.toHaveBeenCalled();
  });

  it('allows local policy to tighten a remote hard budget', async () => {
    stubRemotePolicy({ budget: { maxSpendUsd: 1 } });
    const captar = createCaptar({
      project: 'local-tightening',
      pricing: zeroPricing,
      controlPlane: {
        hookId: 'hook_test',
        baseUrl: 'https://control.test',
        syncPolicy: true,
      },
    });

    const session = await captar.startSession({ budget: { maxSpendUsd: 0.25 } });
    expect(session.budget.maxSpendUsd).toBe(0.25);
  });

  it('validates remote JSON at runtime instead of trusting a type assertion', async () => {
    stubRemotePolicy({ budget: { maxSpendUsd: Number.NaN } });
    const captar = createCaptar({
      project: 'invalid-remote',
      pricing: zeroPricing,
      controlPlane: {
        hookId: 'hook_test',
        baseUrl: 'https://control.test',
        syncPolicy: true,
      },
    });

    await expect(captar.startSession()).rejects.toThrow(/control-plane policy.*maxSpendUsd/);
  });
});

describe('zero ceiling semantics', () => {
  it('treats maxRepeatedCalls=0 as block-all rather than disabling the guard', async () => {
    const providerCall = vi.fn(async () => ({ model: 'policy-model' }));
    const captar = createCaptar({ project: 'zero-repeat', pricing: zeroPricing });
    const session = await captar.startSession({
      policy: { budget: { maxRepeatedCalls: 0 } },
    });
    const wrapped = captar.wrapOpenAI(
      { responses: { create: providerCall } },
      { session, provider: 'test' },
    );

    await expect(
      wrapped.responses.create({ model: 'policy-model', input: 'hello' }),
    ).rejects.toThrow(/repeated call fingerprint/);
    expect(providerCall).not.toHaveBeenCalled();
  });

  it('does not allow per-tool options to raise a session tool ceiling', async () => {
    const captar = createCaptar({ project: 'tool-tightening', pricing: zeroPricing });
    const session = await captar.startSession({
      policy: { tool: { maxCallsPerSession: 1 } },
    });
    const first = captar.trackTool('first', {
      session,
      policy: { maxCallsPerSession: 100 },
    });
    const second = captar.trackTool('second', {
      session,
      policy: { maxCallsPerSession: 100 },
    });

    await expect(first.run(async () => 'ok')).resolves.toBe('ok');
    await expect(second.run(async () => 'no')).rejects.toThrow(/maxCallsPerSession=1/);
  });
});
