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
    throw new Error(`Expected one Captar tarball, found ${created.length}`);
  }

  const sdkTarball = join(tarballsDir, created[0]);
  const listing = spawnSync('tar', ['-tzf', sdkTarball], { encoding: 'utf8' });
  if (listing.status !== 0) {
    throw new Error('Could not inspect staged Captar tarball');
  }
  const invalidPath = listing.stdout
    .split('\n')
    .find((entry) => entry.split('/').includes('..'));
  if (invalidPath) {
    throw new Error(`Captar tarball contains invalid parent path: ${invalidPath}`);
  }

  for (const helper of ['config', 'types', 'utils']) {
    const expected = `package/node_modules/@captar/${helper}/package.json`;
    if (!listing.stdout.includes(expected)) {
      throw new Error(`Captar tarball is missing bundled helper: ${expected}`);
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
    `import { createCaptar } from 'captar';\n\nconst captar = createCaptar({ project: 'external-install-smoke' });\nconst session = await captar.startSession({ budget: { maxSpendUsd: 1 } });\nif (!session) throw new Error('Captar session was not created');\nawait session.close();\nawait captar.flush();\nconsole.log('External captar install smoke passed');\n`,
  );

  run('node', ['smoke.mjs'], { cwd: appDir });
  console.log(`Verified registry-safe ${basename(sdkTarball)} from a clean npm consumer project.`);
} finally {
  rmSync(work, { recursive: true, force: true });
  rmSync(stagedSdkDir, { recursive: true, force: true });
}
