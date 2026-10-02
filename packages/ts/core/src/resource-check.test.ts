import { describe, expect, it } from 'vitest';
import { ContractViolationError, ExecutionRun, run } from './index.js';

describe('ExecutionRun.checkResource', () => {
  it('includes committed and in-flight usage without changing the receipt', () => {
    const execution = new ExecutionRun('inspect', { limits: { resources: { writes: 5 } } });
    execution.consume('writes', 2);
    execution.reserve('writes', 2);
    const before = execution.receipt();
    expect(execution.checkResource('writes')).toEqual({
      resource: 'writes',
      requested: 1,
      committed: 2,
      reserved: 2,
      limit: 5,
      remaining: 1,
      allowed: true,
      reason: 'within-limit',
    });
    expect(execution.checkResource('writes', 2).reason).toBe('resource-limit');
    expect(execution.receipt()).toEqual(before);
  });

  it('does not fail an exhausted run, permitting a graceful stop', async () => {
    const result = await run('graceful', { limits: { resources: { writes: 2 } } }, (execution) => {
      let count = 0;
      while (execution.checkResource('writes').allowed) {
        const reservation = execution.reserve('writes', 1);
        execution.commit(reservation);
        count++;
      }
      return count;
    });
    expect(result.value).toBe(2);
    expect(result.receipt.status).toBe('succeeded');
    expect(result.receipt.violations).toEqual([]);
  });

  it('reflects release and actual committed usage', () => {
    const execution = new ExecutionRun('release', { limits: { resources: { writes: 4 } } });
    const pending = execution.reserve('writes', 4);
    expect(execution.checkResource('writes').allowed).toBe(false);
    execution.release(pending);
    expect(execution.checkResource('writes', 4).allowed).toBe(true);
    const second = execution.reserve('writes', 4);
    execution.commit(second, 2);
    expect(execution.checkResource('writes', 2).remaining).toBe(2);
  });

  it('distinguishes unlimited resources from zero capacity', () => {
    const execution = new ExecutionRun('limits', { limits: { resources: { writes: 0 } } });
    expect(execution.checkResource('reads')).toEqual({
      resource: 'reads',
      requested: 1,
      committed: 0,
      reserved: 0,
      allowed: true,
      reason: 'unlimited',
    });
    expect(execution.checkResource('writes')).toMatchObject({ allowed: false, remaining: 0 });
  });

  it.each(['succeeded', 'failed', 'aborted'] as const)('rejects admission after %s', (status) => {
    const execution = new ExecutionRun('terminal');
    if (status === 'succeeded') execution.complete();
    if (status === 'failed') execution.fail();
    if (status === 'aborted') execution.abort();
    expect(execution.checkResource('unlimited')).toMatchObject({
      allowed: false,
      reason: 'not-running',
    });
    expect(execution.receipt().status).toBe(status);
  });

  it('does not hold capacity: reserve is still authoritative', () => {
    const execution = new ExecutionRun('race', { limits: { resources: { writes: 1 } } });
    expect(execution.checkResource('writes').allowed).toBe(true);
    execution.reserve('writes', 1);
    expect(() => execution.reserve('writes', 1)).toThrow(ContractViolationError);
    expect(execution.checkResource('writes').reason).toBe('not-running');
  });

  it.each([0, -1, NaN, Infinity, -Infinity])(
    'rejects invalid amount %s without mutation',
    (amount) => {
      const execution = new ExecutionRun('invalid');
      const before = execution.receipt();
      expect(() => execution.checkResource('writes', amount)).toThrow(RangeError);
      expect(execution.receipt()).toEqual(before);
    }
  );

  it('validates resource names and supports fractional capacity', () => {
    const execution = new ExecutionRun('fractions', { limits: { resources: { units: 1.5 } } });
    expect(() => execution.checkResource('   ')).toThrow('resource names');
    expect(execution.checkResource('units', 1.5).allowed).toBe(true);
    expect(execution.checkResource('units', 1.6).allowed).toBe(false);
  });
});
