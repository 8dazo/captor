import { mkdtempSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const work = mkdtempSync(join(tmpdir(), 'captar-sdk-smoke-'));
const tarballsDir = join(work, 'tarballs');
const appDir = join(work, 'consumer');
const stagedSdkDir = join(root, 'packages', 'ts', 'sdk', '.publish');
mkdirSync(tarballsDir, { recursive: true });
mkdirSync(appDir, { recursive: true });

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    stdio: 'inherit',
    ...options,
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status}`);
  }
  return result;
}

try {
  run('node', ['scripts/stage-sdk-package.mjs']);

  const before = new Set(readdirSync(tarballsDir));
  run('npm', ['pack', '--pack-destination', tarballsDir], { cwd: stagedSdkDir });

  const created = readdirSync(tarballsDir).filter((entry) => !before.has(entry));
  if (created.length !== 1) {
    throw new Error(`Expected one Captor tarball, found ${created.length}`);
  }

  const sdkTarball = join(tarballsDir, created[0]);
  const listing = spawnSync('tar', ['-tzf', sdkTarball], { encoding: 'utf8' });
  if (listing.status !== 0) {
    throw new Error('Could not inspect staged Captor tarball');
  }
  const invalidPath = listing.stdout
    .split('\n')
    .find((entry) => entry.split('/').includes('..'));
  if (invalidPath) {
    throw new Error(`Captor tarball contains invalid parent path: ${invalidPath}`);
  }

  for (const helper of ['config', 'types', 'utils']) {
    const expected = `package/node_modules/@captar/${helper}/package.json`;
    if (!listing.stdout.includes(expected)) {
      throw new Error(`Captor tarball is missing bundled helper: ${expected}`);
    }
  }

  for (const runtimeFile of [
    'package/dist/execution/index.js',
    'package/dist/execution/store.js',
    'package/dist/execution/prisma.js',
  ]) {
    if (!listing.stdout.includes(runtimeFile)) {
      throw new Error(`Captor tarball is missing execution runtime file: ${runtimeFile}`);
    }
  }

  const dependencyPath = `file:${relative(appDir, sdkTarball).replaceAll('\\', '/')}`;
  writeFileSync(
    join(appDir, 'package.json'),
    `${JSON.stringify({ name: 'captar-external-install-smoke', private: true, type: 'module', dependencies: { captar: dependencyPath } }, null, 2)}\n`,
  );

  run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund'], { cwd: appDir });
  writeFileSync(
    join(appDir, 'smoke.mjs'),
    `import { createCaptar } from 'captar';\nimport { run as runExecution } from 'captar/execution';\nimport { JsonlRunStore, SqliteRunStore } from 'captar/execution/store';\nimport { createPrismaQueryGuard } from 'captar/execution/prisma';\n\nif (typeof JsonlRunStore !== 'function' || typeof SqliteRunStore !== 'function') {\n  throw new Error('Execution store subpath is not importable');\n}\n\nconst execution = await runExecution(\n  'external-backfill-smoke',\n  {\n    limits: { resources: { 'db.writes': 2 } },\n    outcome: { 'records.processed': { min: 1 } },\n  },\n  async (run) => {\n    const prismaGuard = createPrismaQueryGuard(run);\n    await prismaGuard({\n      model: 'User',\n      operation: 'create',\n      args: { data: { id: 1 } },\n      query: async () => ({ id: 1 }),\n    });\n    run.metric('records.processed', 1);\n    return 'ok';\n  },\n);\n\nif (execution.value !== 'ok' || execution.receipt.status !== 'succeeded') {\n  throw new Error('Execution-contract smoke failed');\n}\n\nif (execution.receipt.resources['db.writes']?.committed !== 1) {\n  throw new Error('Prisma execution guard did not commit db.writes usage');\n}\n\nconst legacy = createCaptar({ project: 'external-install-smoke' });\nconst session = await legacy.startSession({ budget: { maxSpendUsd: 1 } });\nif (!session) throw new Error('Legacy Captor session was not created');\nawait session.close();\nawait legacy.flush();\nconsole.log('External captar install smoke passed');\n`,
  );

  run('node', ['smoke.mjs'], { cwd: appDir });
  console.log(`Verified registry-safe ${basename(sdkTarball)} from a clean npm consumer project.`);
} finally {
  rmSync(work, { recursive: true, force: true });
  rmSync(stagedSdkDir, { recursive: true, force: true });
}
