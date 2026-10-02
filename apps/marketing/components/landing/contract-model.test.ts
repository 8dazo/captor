import { describe, expect, it } from 'vitest';
import { makeContractPlan } from './contract-model';
import { ContractViolationError, run } from '../../../../packages/ts/core/src/index';

describe('contract builder', () => {
  it('matches real SDK admission for all presets and representative limits', async () => {
    for (const preset of [0, 1, 2]) {
      for (const limit of [1, 4, 7, 20]) {
        for (const units of [1, 2, 5]) {
          const plan = makeContractPlan(preset, limit, 6, units);
          let admitted = 0;
          let blocked = false;
          try {
            await run(plan.preset.name, plan.contract, (execution) => {
              for (let i = 0; i < 6; i++) {
                const hold = execution.reserve(plan.preset.resource, units);
                execution.commit(hold);
                admitted++;
              }
            });
          } catch (error) {
            if (!(error instanceof ContractViolationError)) throw error;
            blocked = true;
          }
          expect({ admitted, blocked }).toEqual({ admitted: plan.admitted, blocked: plan.blocked });
        }
      }
    }
  });
  it('blocks the fifth request at a four-request limit', () => {
    expect(makeContractPlan(0, 4, 6, 1)).toMatchObject({
      admitted: 4,
      blocked: true,
      used: 4,
      remaining: 0,
    });
  });
  it('admits an exact fit and excludes a partially affordable operation', () => {
    expect(makeContractPlan(1, 6, 2, 3)).toMatchObject({ admitted: 2, blocked: false });
    expect(makeContractPlan(1, 5, 2, 3)).toMatchObject({
      admitted: 1,
      blocked: true,
      remaining: 2,
    });
  });
  it('can block the first operation without inventing completed work', () => {
    expect(makeContractPlan(2, 1, 4, 2)).toMatchObject({ admitted: 0, used: 0, blocked: true });
  });
  it('generates the selected resource and a handled SDK example', () => {
    const plan = makeContractPlan(2, 8, 4, 2);
    expect(plan.contract).toEqual({ limits: { resources: { 'tool.calls': 8 } } });
    expect(plan.code).toContain("execution.reserve('tool.calls', 2)");
    expect(plan.code).toContain('i < 4');
    expect(plan.code).toContain('ContractViolationError');
  });
  it.each([NaN, Infinity, 0, -1, 1.5, 101])('rejects invalid values: %s', (value) => {
    expect(() => makeContractPlan(0, value, 4, 1)).toThrow(RangeError);
    expect(() => makeContractPlan(0, 4, value, 1)).toThrow(RangeError);
    expect(() => makeContractPlan(0, 4, 4, value)).toThrow(RangeError);
  });
  it('rejects unknown presets', () =>
    expect(() => makeContractPlan(9, 4, 4, 1)).toThrow(RangeError));
});
