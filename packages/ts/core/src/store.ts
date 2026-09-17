import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import {
  ContractViolationError,
  type ExecutionContract,
  type ExecutionReceipt,
  type ExecutionResult,
  type ExecutionRun,
  run,
} from './index.js';

export interface RunStore {
  save(receipt: ExecutionReceipt): Promise<void>;
  list(): Promise<ExecutionReceipt[]>;
  get(id: string): Promise<ExecutionReceipt | null>;
}

export interface JsonlRunStoreOptions {
  path?: string;
}

/**
 * Append-only local receipt store. JSONL stays the zero-dependency default so
 * Captor remains useful on Node 18+ with no native modules or hosted backend.
 */
export class JsonlRunStore implements RunStore {
  readonly path: string;

  constructor(options: JsonlRunStoreOptions = {}) {
    this.path = resolve(options.path ?? '.captor/runs.jsonl');
  }

  async save(receipt: ExecutionReceipt): Promise<void> {
    await mkdir(dirname(this.path), { recursive: true });
    await appendFile(this.path, `${JSON.stringify(receipt)}\n`, 'utf8');
  }

  async list(): Promise<ExecutionReceipt[]> {
    let source: string;
    try {
      source = await readFile(this.path, 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw error;
    }

    const byId = new Map<string, ExecutionReceipt>();
    for (const line of source.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const receipt = JSON.parse(trimmed) as ExecutionReceipt;
      byId.set(receipt.id, receipt);
    }

    return [...byId.values()].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  }

  async get(id: string): Promise<ExecutionReceipt | null> {
    const receipts = await this.list();
    return receipts.find((receipt) => receipt.id === id) ?? null;
  }
}

export interface SqliteRunStoreOptions {
  path?: string;
}

/**
 * Durable single-file receipt store backed by Node's built-in SQLite runtime.
 *
 * `node:sqlite` is available on modern Node 22+ releases. The import is lazy so
 * the rest of Captor remains compatible with Node 18/20 when this store is not
 * used. JSONL remains the universal default.
 */
export class SqliteRunStore implements RunStore {
  readonly path: string;

  constructor(options: SqliteRunStoreOptions = {}) {
    this.path = resolve(options.path ?? '.captor/runs.sqlite');
  }

  async save(receipt: ExecutionReceipt): Promise<void> {
    await this.withDatabase((database) => {
      database
        .prepare(
          `INSERT INTO captor_runs (id, started_at, receipt_json)
           VALUES (?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             started_at = excluded.started_at,
             receipt_json = excluded.receipt_json`,
        )
        .run(receipt.id, receipt.startedAt, JSON.stringify(receipt));
    });
  }

  async list(): Promise<ExecutionReceipt[]> {
    return this.withDatabase((database) => {
      const rows = database
        .prepare(
          `SELECT receipt_json AS receiptJson
           FROM captor_runs
           ORDER BY started_at DESC`,
        )
        .all() as Array<{ receiptJson: string }>;

      return rows.map((row) => JSON.parse(row.receiptJson) as ExecutionReceipt);
    });
  }

  async get(id: string): Promise<ExecutionReceipt | null> {
    return this.withDatabase((database) => {
      const row = database
        .prepare(
          `SELECT receipt_json AS receiptJson
           FROM captor_runs
           WHERE id = ?`,
        )
        .get(id) as { receiptJson: string } | undefined;

      return row ? (JSON.parse(row.receiptJson) as ExecutionReceipt) : null;
    });
  }

  private async withDatabase<T>(
    action: (database: import('node:sqlite').DatabaseSync) => T,
  ): Promise<T> {
    await mkdir(dirname(this.path), { recursive: true });

    let sqlite: typeof import('node:sqlite');
    try {
      sqlite = await import('node:sqlite');
    } catch (error) {
      throw new Error(
        'SqliteRunStore requires a Node.js release with the built-in node:sqlite module (Node 22+). Use JsonlRunStore on older runtimes.',
        { cause: error },
      );
    }

    const database = new sqlite.DatabaseSync(this.path);
    try {
      database.exec(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS captor_runs (
          id TEXT PRIMARY KEY,
          started_at TEXT NOT NULL,
          receipt_json TEXT NOT NULL
        );
      `);
      return action(database);
    } finally {
      database.close();
    }
  }
}

export async function runStored<T>(
  name: string,
  contract: ExecutionContract,
  execute: (execution: ExecutionRun) => Promise<T> | T,
  store: RunStore = new JsonlRunStore(),
): Promise<ExecutionResult<T>> {
  try {
    const result = await run(name, contract, execute);
    await store.save(result.receipt);
    return result;
  } catch (error) {
    if (error instanceof ContractViolationError) {
      await store.save(error.receipt);
    }
    throw error;
  }
}
