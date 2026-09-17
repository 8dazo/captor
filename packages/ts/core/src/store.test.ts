import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { ContractViolationError } from './index.js';
import { JsonlRunStore, runStored, SqliteRunStore } from './store.js';

const temporaryDirectories: string[] = [];

async function createDirectory(prefix: string): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), prefix));
  temporaryDirectories.push(directory);
  return directory;
}

async function createStore(): Promise<JsonlRunStore> {
  const directory = await createDirectory('captar-runs-');
  return new JsonlRunStore({ path: join(directory, 'runs.jsonl') });
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe('JsonlRunStore', () => {
  it('persists successful execution receipts', async () => {
    const store = await createStore();
    const result = await runStored(
      'customer-sync',
      { limits: { resources: { 'http.requests': 2 } } },
      async (run) => {
        run.consume('http.requests');
        return 'ok';
      },
      store,
    );

    const listed = await store.list();
    expect(listed).toHaveLength(1);
    expect(listed[0]?.id).toBe(result.receipt.id);
    expect((await store.get(result.receipt.id))?.status).toBe('succeeded');
  });

  it('persists contract violations', async () => {
    const store = await createStore();

    await expect(
      runStored(
        'dangerous-backfill',
        { limits: { resources: { 'db.writes': 1 } } },
        async (run) => {
          run.consume('db.writes');
          run.consume('db.writes');
        },
        store,
      ),
    ).rejects.toBeInstanceOf(ContractViolationError);

    const listed = await store.list();
    expect(listed).toHaveLength(1);
    expect(listed[0]?.status).toBe('failed');
    expect(listed[0]?.violations[0]?.resource).toBe('db.writes');
  });
});

describe('SqliteRunStore', () => {
  it('provides a clear compatibility boundary on runtimes without node:sqlite', async () => {
    const directory = await createDirectory('captar-sqlite-runs-');
    const store = new SqliteRunStore({ path: join(directory, 'runs.sqlite') });
    const nodeMajor = Number.parseInt(process.versions.node.split('.')[0] ?? '0', 10);

    if (nodeMajor < 22) {
      await expect(store.list()).rejects.toThrow('SqliteRunStore requires');
      return;
    }

    const result = await runStored(
      'sqlite-customer-sync',
      { limits: { resources: { 'http.requests': 2 } } },
      async (run) => {
        run.consume('http.requests');
        return 'ok';
      },
      store,
    );

    expect((await store.get(result.receipt.id))?.status).toBe('succeeded');
    expect((await store.list())[0]?.id).toBe(result.receipt.id);
  });
});
