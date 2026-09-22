import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rename, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { backfill, ContractViolationError, JsonlRunStore } from '../packages/ts/sdk/dist/index.js';

const [phase, suppliedDirectory] = process.argv.slice(2);
const source = [1, 2, 3, 4, 5, 6]; // Stable input and ordering across both processes.
if (!phase) {
  await mkdir('.captor', { recursive: true });
  const directory = await mkdtemp(resolve('.captor/recovery-demo-'));
  for (const step of ['stop', 'resume', 'verify']) {
    const child = spawnSync(process.execPath, [fileURLToPath(import.meta.url), step, directory], {
      stdio: 'inherit',
    });
    assert.equal(child.status, 0, `${step} process failed`);
  }
  const store = new JsonlRunStore({ path: join(directory, 'runs.jsonl') });
  const final = (await store.list()).find((receipt) => receipt.status === 'succeeded');
  assert.ok(final);
  const cli = fileURLToPath(new URL('../packages/ts/sdk/dist/cli.js', import.meta.url));
  for (const args of [['runs'], ['inspect', final.id]]) {
    const child = spawnSync(process.execPath, [cli, ...args, '--file', store.path], {
      stdio: 'inherit',
    });
    assert.equal(child.status, 0, 'CLI inspection failed');
  }
  console.log(`Demo passed. Receipts and application state: ${directory}`);
} else {
  assert.ok(['stop', 'resume', 'verify'].includes(phase), 'Unknown phase');
  assert.ok(suppliedDirectory, 'Directory required');
  const directory = resolve(suppliedDirectory);
  const statePath = join(directory, 'customers.json');
  const store = new JsonlRunStore({ path: join(directory, 'runs.jsonl') });
  let completed;
  try {
    completed = JSON.parse(await readFile(statePath, 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    completed = [];
  }
  const ids = new Set(completed);
  if (phase === 'verify') {
    assert.deepEqual(
      [...ids].sort((a, b) => a - b),
      source
    );
    const receipts = await store.list();
    assert.equal(receipts.length, 2);
    assert.ok(
      receipts.some((r) => r.status === 'failed' && r.checkpoints['backfill.cursor'] === 4)
    );
    assert.ok(
      receipts.some((r) => r.status === 'succeeded' && r.checkpoints['backfill.cursor'] === 6)
    );
    console.log('Fresh verifier: 6/6 customers updated; failed and succeeded receipts preserved.');
  } else {
    try {
      const result = await backfill({
        name: 'customer-repair-demo',
        source,
        batchSize: 2,
        store,
        resume: phase === 'resume',
        resource: 'db.writes',
        contract: {
          limits: { resources: { 'db.writes': phase === 'stop' ? 4 : 2 } },
          ...(phase === 'resume' ? { outcome: { 'backfill.items.processed': { equals: 2 } } } : {}),
        },
        process: async (batch) => {
          // Idempotent application operation: replaying an ID does not duplicate its effect.
          batch.forEach((id) => ids.add(id));
          await writeFile(`${statePath}.tmp`, JSON.stringify([...ids]), 'utf8');
          await rename(`${statePath}.tmp`, statePath);
        },
      });
      assert.equal(phase, 'resume', 'The first run should hit its ceiling');
      assert.equal(result.receipt.checkpoints['backfill.cursor'], 6);
      console.log('Fresh resume process: processed remaining 2 customers; outcome passed.');
    } catch (error) {
      if (phase !== 'stop' || !(error instanceof ContractViolationError)) throw error;
      assert.equal(error.receipt.resources['db.writes'].committed, 4);
      assert.equal(error.receipt.checkpoints['backfill.cursor'], 4);
      assert.deepEqual([...ids], [1, 2, 3, 4]);
      console.log('Stopped before batch 3: 4 committed writes, durable cursor 4.');
    }
  }
}
