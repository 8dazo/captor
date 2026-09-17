import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { backfill } from './backfill.js';
import { ContractViolationError } from './index.js';
import { JsonlRunStore } from './store.js';

describe('backfill resume', () => {
  it('persists the last committed offset and resumes from it', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'captar-backfill-resume-'));
    const store = new JsonlRunStore({ path: join(directory, 'runs.jsonl') });
    const processed: number[] = [];

    try {
      await expect(
        backfill({
          name: 'customers-first-pass',
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

      const failed = (await store.list()).find((receipt) => receipt.name === 'customers-first-pass');
      expect(failed?.checkpoints['backfill.cursor']).toBe(4);
      expect(processed).toEqual([1, 2, 3, 4]);

      const resumed = await backfill({
        name: 'customers-resumed',
        source: [1, 2, 3, 4, 5, 6],
        startAt: 4,
        batchSize: 2,
        resource: 'db.writes',
        contract: {
          limits: { resources: { 'db.writes': 2 } },
          outcome: { 'backfill.items.processed': { equals: 2 } },
        },
        store,
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
