import { describe, expect, it } from 'vitest';

import { BudgetEngine } from '../src/internal/budget-engine.js';

describe('BudgetEngine reconciliation', () => {
  it('records reservation overruns without creating a negative reservation balance', () => {
    const engine = new BudgetEngine({ maxSpendUsd: 1 });
    const reserved = engine.reserve(0.5);
    const result = engine.commit(reserved, 0.7);

    expect(result).toEqual({
      releasedUsd: 0,
      actualUsd: 0.7,
      reservationOverrunUsd: 0.2,
      hardBudgetOverrunUsd: 0,
    });
    expect(engine.getState()).toEqual({
      committedUsd: 0.7,
      reservedUsd: 0,
      remainingUsd: 0.3,
    });
  });

  it('truthfully records provider spend above the hard budget and reports the overrun', () => {
    const engine = new BudgetEngine({ maxSpendUsd: 1 });
    const reserved = engine.reserve(0.8);
    const result = engine.commit(reserved, 1.2);

    expect(result.reservationOverrunUsd).toBe(0.4);
    expect(result.hardBudgetOverrunUsd).toBe(0.2);
    expect(engine.getState()).toEqual({
      committedUsd: 1.2,
      reservedUsd: 0,
      remainingUsd: -0.2,
    });
  });

  it('accumulates repeated sub-micro-dollar charges instead of rounding each call to zero', () => {
    const engine = new BudgetEngine({ maxSpendUsd: 1 });

    for (let index = 0; index < 1000; index += 1) {
      const reserved = engine.reserve(0.00000015);
      engine.commit(reserved, 0.00000015);
    }

    expect(engine.getState().committedUsd).toBe(0.00015);
    expect(engine.getTotals().totalReservedUsd).toBe(0.00015);
    expect(engine.getState().remainingUsd).toBe(0.99985);
  });

  it('preserves sub-micro reserve/release conservation', () => {
    const engine = new BudgetEngine({ maxSpendUsd: 1 });
    const reserved = engine.reserve(0.0000009);
    const result = engine.commit(reserved, 0.00000015);

    expect(result.actualUsd).toBe(0.00000015);
    expect(result.releasedUsd).toBe(0.00000075);
    expect(engine.getState().reservedUsd).toBe(0);
    expect(engine.getTotals()).toEqual({
      totalReservedUsd: 0.0000009,
      totalReleasedUsd: 0.00000075,
      totalCommittedUsd: 0.00000015,
    });
  });

  it('keeps true zero-cost accounting exactly zero', () => {
    const engine = new BudgetEngine({ maxSpendUsd: 1 });
    const reserved = engine.reserve(0);
    const result = engine.commit(reserved, 0);

    expect(result.actualUsd).toBe(0);
    expect(engine.getState().committedUsd).toBe(0);
  });

  it('rejects commits that try to release more reservation than exists', () => {
    const engine = new BudgetEngine({ maxSpendUsd: 1 });
    engine.reserve(0.2);

    expect(() => engine.commit(0.3, 0.1)).toThrow(/only .* currently reserved/i);
    expect(engine.getState().reservedUsd).toBe(0.2);
  });

  it('rejects negative or non-finite accounting values', () => {
    const engine = new BudgetEngine({ maxSpendUsd: 1 });

    expect(() => engine.reserve(-1)).toThrow(/non-negative/);
    expect(() => engine.reserve(Number.NaN)).toThrow(/finite/);
    expect(() => engine.commit(-1, 0)).toThrow(/non-negative/);
    expect(() => engine.commit(0, Number.POSITIVE_INFINITY)).toThrow(/finite/);
  });
});
