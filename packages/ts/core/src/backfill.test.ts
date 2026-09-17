import { describe, expect, it } from 'vitest';

import { ContractViolationError } from './index.js';
import { runBackfill } from './backfill.js';

describe('runBackfill', () => {
  it('processes sync iterables in batches and checkpoints only after committed batches', async () => {
    const seen: number[][] = [];

    const result = await runBackfill({
      name: 'users-backfill',
      source: [1, 2, 3, 4, 5],
      batchSize: 2,
      contract: {
        limits: {
          resources: {
            'backfill.items': 5,
          },
        },
      },
      processBatch(items) {
        seen.push([...items]);
      },
      checkpoint(lastItem) {
        return lastItem;
      },
    });

    expect(seen).toEqual([[1, 2], [3, 4], [5]]);
    expect(result.value).toEqual({
      batchesProcessed: 3,
      itemsProcessed: 5,
      dryRun: false,
    });
    expect(result.receipt.resources['backfill.items']).toEqual({
      limit: 5,
      committed: 5,
      reserved: 0,
    });
    expect(result.receipt.checkpoints['backfill.cursor']).toBe(5);
    expect(result.receipt.metrics['backfill.items.processed']).toBe(5);
  });

  it('accepts async iterables', async () => {
    async function* source() {
      yield 'a';
      yield 'b';
      yield 'c';
    }

    const batches: string[][] = [];
    const result = await runBackfill({
      name: 'async-backfill',
      source: source(),
      batchSize: 2,
      processBatch(items) {
        batches.push([...items]);
      },
    });

    expect(batches).toEqual([['a', 'b'], ['c']]);
    expect(result.value.itemsProcessed).toBe(3);
  });

  it('does not call the mutating processor or write checkpoints in dry-run mode', async () => {
    let processCalls = 0;
    let previewCalls = 0;

    const result = await runBackfill({
      name: 'preview-backfill',
      source: [1, 2, 3],
      batchSize: 2,
      dryRun: true,
      processBatch() {
        processCalls += 1;
      },
      previewBatch() {
        previewCalls += 1;
      },
      checkpoint(lastItem) {
        return lastItem;
      },
    });

    expect(processCalls).toBe(0);
    expect(previewCalls).toBe(2);
    expect(result.value.dryRun).toBe(true);
    expect(result.receipt.checkpoints).toEqual({});
    expect(result.receipt.resources['backfill.items']).toBeUndefined();
  });

  it('blocks the next batch before processing when the item budget is exhausted', async () => {
    const processed: number[] = [];

    try {
      await runBackfill({
        name: 'bounded-backfill',
        source: [1, 2, 3, 4],
        batchSize: 2,
        contract: {
          limits: {
            resources: {
              'backfill.items': 3,
            },
          },
        },
        processBatch(items) {
          processed.push(...items);
        },
      });
      throw new Error('expected contract violation');
    } catch (error) {
      expect(error).toBeInstanceOf(ContractViolationError);
      expect(processed).toEqual([1, 2]);
      const violation = error as ContractViolationError;
      expect(violation.receipt.resources['backfill.items']?.committed).toBe(2);
      expect(violation.receipt.violations[0]).toMatchObject({
        kind: 'resource-limit',
        resource: 'backfill.items',
        limit: 3,
        actual: 4,
      });
    }
  });
});
