import type { ExecutionRun, Reservation } from './index.js';

export interface PrismaGuardOptions {
  /** Captor resource charged for database mutations. */
  resource?: string;
  /**
   * Behavior for bulk mutations whose affected-row count cannot be known before
   * the database executes them. Blocking is the only mode that preserves a hard
   * preflight write ceiling.
   */
  unboundedBulk?: 'block' | 'allow-unmetered';
}

export interface PrismaQueryGuardContext {
  model?: string;
  operation: string;
  args: unknown;
  query(args: unknown): Promise<unknown>;
}

export class UnboundedPrismaWriteError extends Error {
  readonly model?: string;
  readonly operation: string;

  constructor(operation: string, model?: string) {
    super(
      `Cannot safely preflight Prisma ${operation}${model ? ` on ${model}` : ''}: the affected-row count is unknown before execution. Rewrite the operation into bounded batches or explicitly opt into allow-unmetered mode.`
    );
    this.name = 'UnboundedPrismaWriteError';
    this.operation = operation;
    this.model = model;
  }
}

const SINGLE_WRITE_OPERATIONS = new Set(['create', 'update', 'upsert', 'delete']);

const KNOWN_BATCH_WRITE_OPERATIONS = new Set(['createMany', 'createManyAndReturn']);
const UNBOUNDED_WRITE_OPERATIONS = new Set(['updateMany', 'updateManyAndReturn', 'deleteMany']);

function createManySize(args: unknown): number {
  if (!args || typeof args !== 'object' || !('data' in args)) {
    return 0;
  }

  const data = (args as { data?: unknown }).data;
  return Array.isArray(data) ? data.length : data === undefined ? 0 : 1;
}

function committedCount(result: unknown, reserved: number): number {
  if (
    result &&
    typeof result === 'object' &&
    'count' in result &&
    typeof (result as { count?: unknown }).count === 'number'
  ) {
    return Math.max(0, (result as { count: number }).count);
  }

  if (Array.isArray(result)) {
    return result.length;
  }

  return reserved;
}

async function executeReserved(
  execution: ExecutionRun,
  resource: string,
  amount: number,
  context: PrismaQueryGuardContext
): Promise<unknown> {
  if (amount <= 0) {
    return context.query(context.args);
  }

  const reservation: Reservation = execution.reserve(resource, amount);
  let result: unknown;
  try {
    result = await context.query(context.args);
  } catch (error) {
    if (execution.receipt().status === 'running') execution.release(reservation);
    throw error;
  }
  execution.commit(reservation, committedCount(result, amount));
  return result;
}

/**
 * Prisma `$extends` query callback that charges database mutations against a
 * Captor execution before side effects occur.
 *
 * Usage:
 *
 * ```ts
 * const guarded = prisma.$extends({
 *   query: {
 *     $allModels: {
 *       $allOperations: createPrismaQueryGuard(execution),
 *     },
 *   },
 * });
 * ```
 *
 * Single-row writes reserve one unit. `createMany` reserves the input row count.
 * `updateMany` and `deleteMany` are blocked by default because Prisma does not
 * expose their affected-row count before the mutation executes; use bounded
 * batches if a hard write ceiling matters.
 */
export function createPrismaQueryGuard(
  execution: ExecutionRun,
  options: PrismaGuardOptions = {}
): (context: PrismaQueryGuardContext) => Promise<unknown> {
  const resource = options.resource ?? 'db.writes';
  const unboundedBulk = options.unboundedBulk ?? 'block';

  return async (context) => {
    if (SINGLE_WRITE_OPERATIONS.has(context.operation)) {
      return executeReserved(execution, resource, 1, context);
    }

    if (KNOWN_BATCH_WRITE_OPERATIONS.has(context.operation)) {
      return executeReserved(execution, resource, createManySize(context.args), context);
    }

    if (UNBOUNDED_WRITE_OPERATIONS.has(context.operation)) {
      if (unboundedBulk === 'block') {
        throw new UnboundedPrismaWriteError(context.operation, context.model);
      }
      return context.query(context.args);
    }

    return context.query(context.args);
  };
}
