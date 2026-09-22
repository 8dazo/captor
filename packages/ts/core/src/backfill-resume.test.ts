import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { backfill } from './backfill.js';
import { ContractViolationError } from './index.js';
import { JsonlRunStore, RunPersistenceError } from './store.js';

describe('backfill resume', () => {
  it('persists an application failure and replays only the uncheckpointed batch', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'captar-failed-batch-'));
    const store = new JsonlRunStore({ path: join(directory, 'runs.jsonl') });
    const writes = new Set<number>();
    const failure = new Error('interrupted batch');
    try {
      await expect(
        backfill({
          name: 'repair',
          source: [1, 2, 3, 4],
          batchSize: 2,
          store,
          process: (batch) => {
            writes.add(batch[0]!);
            if (batch[0] === 3) throw failure;
            writes.add(batch[1]!);
          },
        })
      ).rejects.toBe(failure);
      expect((await store.list())[0]).toMatchObject({
        status: 'failed',
        checkpoints: { 'backfill.cursor': 2 },
      });
      const replayed: number[] = [];
      const resumed = await backfill({
        name: 'repair',
        source: [1, 2, 3, 4],
        batchSize: 2,
        store,
        resume: true,
        process: (batch) => {
          replayed.push(...batch);
          batch.forEach((id) => writes.add(id));
        },
      });
      expect(replayed).toEqual([3, 4]);
      expect([...writes]).toEqual([1, 2, 3, 4]);
      expect(resumed.receipt.status).toBe('succeeded');
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('stops after a checkpoint save fails; retry uses only durable progress', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'captar-save-failure-'));
    const durable = new JsonlRunStore({ path: join(directory, 'runs.jsonl') });
    let saves = 0;
    const store = {
      save: async (receipt: Parameters<JsonlRunStore['save']>[0]) => {
        if (++saves > 1) throw new Error('disk unavailable');
        await durable.save(receipt);
      },
      list: () => durable.list(),
      get: (id: string) => durable.get(id),
    };
    const seen: number[] = [];
    try {
      await expect(
        backfill({
          name: 'repair',
          source: [1, 2, 3, 4, 5, 6],
          batchSize: 2,
          store,
          process: (batch) => {
            seen.push(...batch);
          },
        })
      ).rejects.toBeInstanceOf(RunPersistenceError);
      expect(seen).toEqual([1, 2, 3, 4]);
      expect((await durable.list())[0]?.checkpoints['backfill.cursor']).toBe(2);
      const replayed: number[] = [];
      await backfill({
        name: 'repair',
        source: [1, 2, 3, 4, 5, 6],
        batchSize: 2,
        store: durable,
        resume: true,
        process: (batch) => {
          replayed.push(...batch);
        },
      });
      expect(replayed).toEqual([3, 4, 5, 6]);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('persists the last committed offset and resumes from it with a fresh store instance', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'captar-backfill-resume-'));
    const path = join(directory, 'runs.jsonl');
    const store = new JsonlRunStore({ path });
    const processed: number[] = [];

    try {
      await expect(
        backfill({
          name: 'customers',
          source: [1, 2, 3, 4, 5, 6],
          batchSize: 2,
          resource: 'db.writes',
          contract: { limits: { resources: { 'db.writes': 4 } } },
          store,
          process: async (batch) => {
            processed.push(...batch);
          },
        })
      ).rejects.toBeInstanceOf(ContractViolationError);

      const failed = (await store.list()).find((receipt) => receipt.name === 'customers');
      expect(failed?.checkpoints['backfill.cursor']).toBe(4);
      expect(processed).toEqual([1, 2, 3, 4]);

      const restartedStore = new JsonlRunStore({ path });
      const resumed = await backfill({
        name: 'customers',
        source: [1, 2, 3, 4, 5, 6],
        resume: true,
        batchSize: 2,
        resource: 'db.writes',
        contract: {
          limits: { resources: { 'db.writes': 2 } },
          outcome: { 'backfill.items.processed': { equals: 2 } },
        },
        store: restartedStore,
        process: async (batch) => {
          processed.push(...batch);
        },
      });

      expect(resumed.receipt.status).toBe('succeeded');
      expect(resumed.receipt.checkpoints['backfill.cursor']).toBe(6);
      expect(processed).toEqual([1, 2, 3, 4, 5, 6]);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
