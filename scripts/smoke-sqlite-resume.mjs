import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const work = mkdtempSync(join(tmpdir(), 'captar-sqlite-resume-'));
const databasePath = join(work, 'runs.sqlite');
const processedPath = join(work, 'processed.txt');
const workerPath = join(work, 'worker.mjs');
const backfillUrl = pathToFileURL(join(root, 'packages', 'ts', 'core', 'dist', 'backfill.js')).href;
const storeUrl = pathToFileURL(join(root, 'packages', 'ts', 'core', 'dist', 'store.js')).href;

function runWorker(phase) {
  return spawnSync(process.execPath, [workerPath, phase, databasePath, processedPath], {
    cwd: root,
    encoding: 'utf8',
  });
}

try {
  const nodeMajor = Number.parseInt(process.versions.node.split('.')[0] ?? '0', 10);
  if (nodeMajor < 22) {
    throw new Error('SQLite resume smoke requires Node 22+');
  }

  writeFileSync(
    workerPath,
    `import { appendFile } from 'node:fs/promises';\nimport { backfill } from ${JSON.stringify(backfillUrl)};\nimport { SqliteRunStore } from ${JSON.stringify(storeUrl)};\n\nconst [phase, databasePath, processedPath] = process.argv.slice(2);\nconst store = new SqliteRunStore({ path: databasePath });\nconst isResume = phase === 'resume';\n\ntry {\n  const result = await backfill({\n    name: 'sqlite-fresh-process-backfill',\n    source: [1, 2, 3, 4, 5, 6],\n    resume: isResume,\n    batchSize: 2,\n    resource: 'db.writes',\n    contract: {\n      limits: { resources: { 'db.writes': isResume ? 2 : 4 } },\n      ...(isResume ? { outcome: { 'backfill.items.processed': { equals: 2 } } } : {}),\n    },\n    store,\n    process: async (batch) => {\n      await appendFile(processedPath, batch.join(',') + '\\n', 'utf8');\n    },\n  });\n\n  if (!isResume) {\n    console.error('first process unexpectedly completed without hitting its write ceiling');\n    process.exit(10);\n  }\n\n  if (result.receipt.checkpoints['backfill.cursor'] !== 6) {\n    console.error('resumed process did not finish at checkpoint 6');\n    process.exit(11);\n  }\n} catch (error) {\n  if (!isResume) {\n    process.exit(17);\n  }\n  console.error(error);\n  process.exit(12);\n}\n`,
    'utf8',
  );

  const first = runWorker('first');
  if (first.status !== 17) {
    throw new Error(`first process did not stop at the expected contract boundary: ${first.stderr || first.stdout}`);
  }

  const resumed = runWorker('resume');
  if (resumed.status !== 0) {
    throw new Error(`resumed process failed: ${resumed.stderr || resumed.stdout}`);
  }

  const processed = readFileSync(processedPath, 'utf8')
    .trim()
    .split('\n')
    .flatMap((line) => line.split(',').filter(Boolean).map(Number));

  if (JSON.stringify(processed) !== JSON.stringify([1, 2, 3, 4, 5, 6])) {
    throw new Error(`resume reprocessed or skipped rows: ${JSON.stringify(processed)}`);
  }

  const { SqliteRunStore } = await import(storeUrl);
  const store = new SqliteRunStore({ path: databasePath });
  const receipts = await store.list();
  const finalReceipt = receipts.find(
    (receipt) =>
      receipt.name === 'sqlite-fresh-process-backfill' &&
      receipt.status === 'succeeded' &&
      receipt.checkpoints['backfill.cursor'] === 6,
  );

  if (!finalReceipt) {
    throw new Error('final successful receipt was not preserved in SQLite');
  }

  console.log('Fresh-process SQLite backfill resume smoke passed');
} finally {
  rmSync(work, { recursive: true, force: true });
}
