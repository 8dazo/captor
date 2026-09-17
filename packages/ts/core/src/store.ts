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
 * Append-only local receipt store. JSONL keeps the OSS runtime dependency-free,
 * inspectable with normal shell tools, and safe to use without Captor Cloud.
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
