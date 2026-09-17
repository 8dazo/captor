import {
  type ExecutionContract,
  type ExecutionResult,
  type ExecutionRun,
  run,
} from './index.js';

export type BackfillSource<T> = Iterable<T> | AsyncIterable<T>;

export interface BackfillBatchContext {
  run: ExecutionRun;
  batchIndex: number;
  itemOffset: number;
  dryRun: boolean;
}

type BatchHandler<T> = (
  items: readonly T[],
  context: BackfillBatchContext,
) => Promise<void> | void;

export interface BackfillOptions<T> {
  name: string;
  source: BackfillSource<T>;
  contract?: ExecutionContract;
  batchSize?: number;
  dryRun?: boolean;
  resource?: string;
  resourceAmount?: (items: readonly T[], context: BackfillBatchContext) => number;
  checkpointName?: string;
  /** Preferred public name. */
  process?: BatchHandler<T>;
  /** Backward-compatible name from the first internal implementation. */
  processBatch?: BatchHandler<T>;
  previewBatch?: BatchHandler<T>;
  checkpoint?: (lastItem: T, absoluteIndex: number) => unknown;
}

export interface BackfillSummary {
  batchesProcessed: number;
  itemsProcessed: number;
  dryRun: boolean;
}

function assertPositiveInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new RangeError(`${label} must be a positive integer`);
  }
}

function assertFiniteNonNegative(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} must be a finite non-negative number`);
  }
}

async function* toAsyncIterable<T>(source: BackfillSource<T>): AsyncGenerator<T> {
  if (Symbol.asyncIterator in source) {
    for await (const item of source as AsyncIterable<T>) {
      yield item;
    }
    return;
  }

  for (const item of source as Iterable<T>) {
    yield item;
  }
}

export async function runBackfill<T>(
  options: BackfillOptions<T>,
): Promise<ExecutionResult<BackfillSummary>> {
  const batchSize = options.batchSize ?? 100;
  assertPositiveInteger(batchSize, 'batchSize');

  const dryRun = options.dryRun ?? false;
  const resource = options.resource ?? 'backfill.items';
  const checkpointName = options.checkpointName ?? 'backfill.cursor';
  const process = options.process ?? options.processBatch;

  if (!dryRun && !process) {
    throw new Error('backfill requires process or processBatch unless dryRun is true');
  }

  return run(options.name, options.contract ?? {}, async (execution) => {
    let batchesProcessed = 0;
    let itemsProcessed = 0;
    let absoluteIndex = 0;
    let batch: T[] = [];

    const flush = async (): Promise<void> => {
      if (batch.length === 0) {
        return;
      }

      const current = batch;
      batch = [];
      const itemOffset = absoluteIndex - current.length;
      const context: BackfillBatchContext = {
        run: execution,
        batchIndex: batchesProcessed,
        itemOffset,
        dryRun,
      };

      if (dryRun) {
        if (options.previewBatch) {
          await options.previewBatch(current, context);
        }
        batchesProcessed += 1;
        itemsProcessed += current.length;
        execution.metric('backfill.batches.processed', batchesProcessed);
        execution.metric('backfill.items.processed', itemsProcessed);
        return;
      }

      const resourceAmount = options.resourceAmount
        ? options.resourceAmount(current, context)
        : current.length;
      assertFiniteNonNegative(resourceAmount, 'resourceAmount');

      const reservation = resourceAmount > 0 ? execution.reserve(resource, resourceAmount) : null;
      try {
        await process?.(current, context);
        if (reservation) {
          execution.commit(reservation);
        }
      } catch (error) {
        if (reservation) {
          execution.release(reservation);
        }
        throw error;
      }

      batchesProcessed += 1;
      itemsProcessed += current.length;
      execution.metric('backfill.batches.processed', batchesProcessed);
      execution.metric('backfill.items.processed', itemsProcessed);

      if (options.checkpoint) {
        const lastItem = current[current.length - 1];
        if (lastItem !== undefined) {
          execution.checkpoint(
            checkpointName,
            options.checkpoint(lastItem, absoluteIndex - 1),
          );
        }
      }
    };

    for await (const item of toAsyncIterable(options.source)) {
      batch.push(item);
      absoluteIndex += 1;
      if (batch.length >= batchSize) {
        await flush();
      }
    }

    await flush();

    return {
      batchesProcessed,
      itemsProcessed,
      dryRun,
    };
  });
}

/** Public shorthand. `runBackfill` remains available for compatibility. */
export const backfill = runBackfill;
