import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { backfill } from './backfill.js';
import { ContractViolationError } from './index.js';
import { JsonlRunStore } from './store.js';

describe('backfill resume', () => {
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
        }),
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
