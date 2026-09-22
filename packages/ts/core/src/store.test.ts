import { appendFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { ContractViolationError, run } from './index.js';
import { JsonlRunStore, RunPersistenceError, runStored, SqliteRunStore } from './store.js';

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
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true }))
  );
});

describe('JsonlRunStore', () => {
  it.each([new Error('database unavailable'), 'primitive rejection'])(
    'persists ordinary failures and rethrows the original value',
    async (failure) => {
      const store = await createStore();
      await expect(
        runStored(
          'failed-job',
          {},
          (execution) => {
            execution.consume('db.writes', 2);
            execution.checkpoint('cursor', 2);
            throw failure;
          },
          store
        )
      ).rejects.toBe(failure);
      expect(await store.list()).toEqual([
        expect.objectContaining({
          name: 'failed-job',
          status: 'failed',
          endedAt: expect.any(String),
          checkpoints: { cursor: 2 },
          resources: { 'db.writes': { committed: 2, reserved: 0 } },
        }),
      ]);
    }
  );

  it('persists the outer failed run when an inner contract fails', async () => {
    const store = await createStore();
    await expect(
      runStored(
        'outer',
        {},
        () =>
          run(
            'inner',
            {
              limits: { resources: { writes: 0 } },
            },
            (execution) => execution.consume('writes')
          ),
        store
      )
    ).rejects.toBeInstanceOf(ContractViolationError);
    expect(await store.list()).toEqual([
      expect.objectContaining({ name: 'outer', status: 'failed' }),
    ]);
  });

  it('preserves both failures if receipt persistence also fails', async () => {
    const executionError = new Error('application failed');
    const storageError = new Error('disk full');
    const store = {
      save: async () => {
        throw storageError;
      },
      list: async () => [],
      get: async () => null,
    };
    await expect(
      runStored(
        'two-failures',
        {},
        () => {
          throw executionError;
        },
        store
      )
    ).rejects.toMatchObject({
      name: 'RunPersistenceError',
      cause: storageError,
      executionError,
      receipt: expect.objectContaining({ status: 'failed' }),
    });
  });

  it('reports successful work separately from a failed final save', async () => {
    let calls = 0;
    const store = {
      save: async () => {
        throw new Error('disk full');
      },
      list: async () => [],
      get: async () => null,
    };
    await expect(
      runStored(
        'completed-work',
        {},
        () => {
          calls += 1;
        },
        store
      )
    ).rejects.toBeInstanceOf(RunPersistenceError);
    expect(calls).toBe(1);
  });

  it('fails closed on a torn JSONL record instead of silently resuming stale progress', async () => {
    const store = await createStore();
    await runStored('checkpoint', {}, (execution) => execution.checkpoint('cursor', 2), store);
    await appendFile(store.path, '{"id":"unfinished');
    await expect(store.list()).rejects.toBeInstanceOf(SyntaxError);
  });

  it('persists successful execution receipts', async () => {
    const store = await createStore();
    const result = await runStored(
      'customer-sync',
      { limits: { resources: { 'http.requests': 2 } } },
      async (run) => {
        run.consume('http.requests');
        return 'ok';
      },
      store
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
        store
      )
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
      store
    );

    expect((await store.get(result.receipt.id))?.status).toBe('succeeded');
    expect((await store.list())[0]?.id).toBe(result.receipt.id);
  });
});
