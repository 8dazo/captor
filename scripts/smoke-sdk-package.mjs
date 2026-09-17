import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
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
    'package/dist/execution/backfill.js',
    'package/dist/execution/store.js',
    'package/dist/execution/fetch.js',
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

  const installedPackage = JSON.parse(
    readFileSync(join(appDir, 'node_modules', 'captar', 'package.json'), 'utf8'),
  );
  if (installedPackage.version !== '1.0.0') {
    throw new Error(`Expected clean consumer to install captar@1.0.0, got ${installedPackage.version}`);
  }
  if (installedPackage.exports?.['./execution/*']) {
    throw new Error('Captor 1.0 must not expose execution internals through a wildcard export');
  }

  writeFileSync(
    join(appDir, 'smoke.ts'),
    `import {\n  backfill,\n  boundedFetch,\n  ContractViolationError,\n  createCaptar,\n  createPrismaQueryGuard,\n  JsonlRunStore,\n  run,\n  type ExecutionContract,\n  type ExecutionReceipt,\n} from 'captar';\nimport { SqliteRunStore } from 'captar/execution/store';\n\nconst contract: ExecutionContract = {\n  limits: { resources: { 'db.writes': 4, 'http.requests': 2 } },\n  outcome: { 'records.processed': { min: 1 } },\n};\n\nasync function compileOnly(): Promise<ExecutionReceipt> {\n  const result = await run('typed-consumer', contract, async (execution) => {\n    const guardedFetch: typeof fetch = boundedFetch(execution);\n    void guardedFetch;\n    const guard = createPrismaQueryGuard(execution);\n    await guard({ operation: 'create', args: { data: {} }, query: async () => ({}) });\n    execution.metric('records.processed', 1);\n  });\n\n  await backfill({\n    name: 'typed-backfill',\n    source: [1, 2],\n    store: new JsonlRunStore(),\n    process: async () => {},\n  });\n\n  const sqlite: SqliteRunStore | undefined = undefined;\n  void sqlite;\n  const legacy = createCaptar({ project: 'typed-consumer' });\n  void legacy;\n  const errorClass: typeof ContractViolationError = ContractViolationError;\n  void errorClass;\n  return result.receipt;\n}\n\nvoid compileOnly;\n`,
  );
  writeFileSync(
    join(appDir, 'tsconfig.json'),
    `${JSON.stringify({ compilerOptions: { target: 'ES2022', module: 'NodeNext', moduleResolution: 'NodeNext', lib: ['ES2022', 'DOM'], strict: true, noEmit: true, skipLibCheck: false }, include: ['smoke.ts'] }, null, 2)}\n`,
  );
  run('pnpm', ['exec', 'tsc', '-p', join(appDir, 'tsconfig.json')], { cwd: root });

  writeFileSync(
    join(appDir, 'smoke.mjs'),
    `import {\n  backfill,\n  createCaptar,\n  createPrismaQueryGuard,\n  JsonlRunStore,\n  run,\n} from 'captar';\nimport { run as runFromExecutionSubpath } from 'captar/execution';\nimport { JsonlRunStore as JsonlRunStoreFromSubpath } from 'captar/execution/store';\nimport { createPrismaQueryGuard as prismaGuardFromSubpath } from 'captar/execution/prisma';\n\nif (typeof run !== 'function' || typeof backfill !== 'function') {\n  throw new Error('Captor 1.0 execution API is not exported from the package root');\n}\nif (typeof runFromExecutionSubpath !== 'function' || typeof JsonlRunStoreFromSubpath !== 'function' || typeof prismaGuardFromSubpath !== 'function') {\n  throw new Error('Captor execution compatibility subpaths are not importable');\n}\n\nconst execution = await run(\n  'external-contract-smoke',\n  {\n    limits: { resources: { 'db.writes': 2 } },\n    outcome: { 'records.processed': { min: 1 } },\n  },\n  async (execution) => {\n    const prismaGuard = createPrismaQueryGuard(execution);\n    await prismaGuard({\n      model: 'User',\n      operation: 'create',\n      args: { data: { id: 1 } },\n      query: async () => ({ id: 1 }),\n    });\n    execution.metric('records.processed', 1);\n    return 'ok';\n  },\n);\n\nif (execution.value !== 'ok' || execution.receipt.status !== 'succeeded') {\n  throw new Error('Execution-contract smoke failed');\n}\nif (execution.receipt.resources['db.writes']?.committed !== 1) {\n  throw new Error('Prisma execution guard did not commit db.writes usage');\n}\n\nconst store = new JsonlRunStore({ path: './captor-smoke-runs.jsonl' });\nconst backfillResult = await backfill({\n  name: 'external-backfill-smoke',\n  source: [1, 2, 3, 4],\n  batchSize: 2,\n  resource: 'db.writes',\n  contract: { limits: { resources: { 'db.writes': 4 } } },\n  store,\n  process: async () => {},\n});\nif (backfillResult.receipt.checkpoints['backfill.cursor'] !== 4) {\n  throw new Error('Backfill did not persist its final checkpoint');\n}\nif ((await store.list()).length === 0) {\n  throw new Error('Backfill receipt was not persisted to the local store');\n}\n\nconst legacy = createCaptar({ project: 'external-install-smoke' });\nconst session = await legacy.startSession({ budget: { maxSpendUsd: 1 } });\nif (!session) throw new Error('Legacy Captor AI session was not created');\nawait session.close();\nawait legacy.flush();\n\nconsole.log('External captar@1.0.0 install smoke passed');\n`,
  );

  run('node', ['smoke.mjs'], { cwd: appDir });
  console.log(`Verified registry-safe ${basename(sdkTarball)} from a clean typed npm consumer project.`);
} finally {
  rmSync(work, { recursive: true, force: true });
  rmSync(stagedSdkDir, { recursive: true, force: true });
}
