import { describe, expect, it } from 'vitest';
import { ExecutionRun } from '../../../packages/ts/core/src/index';
import {
  MAX_RECEIPT_BYTES,
  parseReceiptFile,
  receiptDuration,
  receiptSchema,
  resourceCapacity,
} from '../lib/execution-receipts';

function receipt() {
  const execution = new ExecutionRun('customer-backfill', {
    limits: { resources: { 'db.writes': 10 } },
  });
  execution.consume('db.writes', 4);
  execution.metric('rows.processed', 4);
  execution.checkpoint('cursor', { id: 4 });
  return execution.complete();
}

describe('execution receipt import', () => {
  it('accepts receipts emitted by the actual SDK and preserves evidence', () => {
    const actual = receipt();
    expect(parseReceiptFile(JSON.stringify(actual))).toEqual([actual]);
  });
  it('takes the final snapshot of each ID in append-only JSONL', () => {
    const actual = receipt();
    const running = { ...actual, status: 'running', endedAt: undefined };
    expect(parseReceiptFile(`${JSON.stringify(running)}\n${JSON.stringify(actual)}\n`)).toEqual([
      actual,
    ]);
  });
  it('rejects legacy traces rather than inventing execution semantics', () => {
    expect(() =>
      parseReceiptFile(JSON.stringify({ id: 'trace', status: 'COMPLETED', inputTokens: 3 }))
    ).toThrow('receipt format');
  });
  it('rejects malformed, empty, oversized and excessive imports', () => {
    for (const source of [
      '{',
      '',
      '[]',
      ' '.repeat(MAX_RECEIPT_BYTES + 1),
      JSON.stringify(Array(201).fill(receipt())),
    ]) {
      expect(() => parseReceiptFile(source)).toThrow();
    }
  });
  it('rejects inconsistent timestamps/status and invalid accounting without rejecting real overruns', () => {
    const actual = receipt();
    expect(receiptSchema.safeParse({ ...actual, endedAt: '2000-01-01T00:00:00Z' }).success).toBe(
      false
    );
    expect(receiptSchema.safeParse({ ...actual, status: 'running' }).success).toBe(false);
    expect(receiptSchema.safeParse({ ...actual, endedAt: undefined }).success).toBe(false);
    expect(
      receiptSchema.safeParse({ ...actual, resources: { db: { committed: -1, reserved: 0 } } })
        .success
    ).toBe(false);
    expect(
      receiptSchema.safeParse({
        ...actual,
        resources: { db: { committed: 20, reserved: 0, limit: 10 } },
      }).success
    ).toBe(true);
  });
  it('preserves future JSON fields on export', () => {
    const value = { ...receipt(), metadata: { source: 'my-script' } };
    expect(parseReceiptFile(JSON.stringify(value))[0]).toEqual(value);
  });
});

describe('receipt presentation', () => {
  it('accounts for reservations and distinguishes zero limits from absent limits', () => {
    expect(resourceCapacity({ committed: 6, reserved: 2, limit: 10 })).toMatchObject({
      held: 8,
      remaining: 2,
      percent: 80,
      exceeded: false,
    });
    expect(resourceCapacity({ committed: 2, reserved: 0, limit: 0 })).toMatchObject({
      remaining: 0,
      percent: 100,
      exceeded: true,
    });
    expect(resourceCapacity({ committed: 0, reserved: 0, limit: 0 }).percent).toBe(0);
    expect(resourceCapacity({ committed: 2, reserved: 0 }).remaining).toBeUndefined();
  });
  it('never computes a live duration for an imported running snapshot', () => {
    expect(receiptDuration({ startedAt: '2026-01-01T00:00:00Z' })).toBe('In progress at capture');
    expect(
      receiptDuration({ startedAt: '2026-01-01T00:00:00Z', endedAt: '2026-01-01T00:00:00Z' })
    ).toBe('0 ms');
  });
});
