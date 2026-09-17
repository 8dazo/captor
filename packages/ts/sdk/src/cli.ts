#!/usr/bin/env node

import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

type Receipt = {
  id: string;
  name: string;
  status: string;
  startedAt: string;
  endedAt?: string;
  resources?: Record<string, { limit?: number; committed: number; reserved: number }>;
  metrics?: Record<string, number>;
  checkpoints?: Record<string, unknown>;
  violations?: Array<{ kind: string; message: string }>;
};

function usage(): never {
  console.error(
    `Captor local execution history\n\nUsage:\n  captor runs [--file PATH]\n  captor inspect <run-id> [--file PATH]\n\nPATH may be a JSONL store (default: .captor/runs.jsonl) or a SQLite store such as .captor/runs.sqlite.`,
  );
  process.exit(1);
}

function option(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function isSqlitePath(path: string): boolean {
  return /\.(?:sqlite|sqlite3|db)$/i.test(path);
}

async function loadJsonlReceipts(path: string): Promise<Receipt[]> {
  let source: string;
  try {
    source = await readFile(path, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }

  const byId = new Map<string, Receipt>();
  for (const line of source.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const receipt = JSON.parse(trimmed) as Receipt;
    byId.set(receipt.id, receipt);
  }
  return [...byId.values()].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

async function loadSqliteReceipts(path: string): Promise<Receipt[]> {
  try {
    await access(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }

  let sqlite: typeof import('node:sqlite');
  try {
    sqlite = await import('node:sqlite');
  } catch (error) {
    throw new Error(
      'Reading a SQLite Captor store requires Node.js 22+. Use the JSONL store on older runtimes.',
      { cause: error },
    );
  }

  const database = new sqlite.DatabaseSync(path, { readOnly: true });
  try {
    const table = database
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'captor_runs'")
      .get();
    if (!table) return [];

    const rows = database
      .prepare(
        `SELECT receipt_json AS receiptJson
         FROM captor_runs
         ORDER BY started_at DESC`,
      )
      .all() as Array<{ receiptJson: string }>;

    return rows.map((row) => JSON.parse(row.receiptJson) as Receipt);
  } finally {
    database.close();
  }
}

async function loadReceipts(path: string): Promise<Receipt[]> {
  return isSqlitePath(path) ? loadSqliteReceipts(path) : loadJsonlReceipts(path);
}

const args = process.argv.slice(2);
const command = args[0];
const file = resolve(option(args, '--file') ?? '.captor/runs.jsonl');
const receipts = await loadReceipts(file);

if (command === 'runs') {
  if (receipts.length === 0) {
    console.log(`No Captor runs found at ${file}`);
    process.exit(0);
  }

  console.table(
    receipts.map((receipt) => ({
      id: receipt.id,
      name: receipt.name,
      status: receipt.status,
      started: receipt.startedAt,
      violations: receipt.violations?.length ?? 0,
    })),
  );
  process.exit(0);
}

if (command === 'inspect') {
  const id = args[1];
  if (!id || id.startsWith('--')) usage();
  const receipt = receipts.find((candidate) => candidate.id === id);
  if (!receipt) {
    console.error(`Run ${id} was not found in ${file}`);
    process.exit(2);
  }
  console.log(JSON.stringify(receipt, null, 2));
  process.exit(0);
}

usage();
