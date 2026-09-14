import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const work = mkdtempSync(join(tmpdir(), 'captar-sdk-smoke-'));
const tarballsDir = join(work, 'tarballs');
const appDir = join(work, 'consumer');
mkdirSync(tarballsDir, { recursive: true });
mkdirSync(appDir, { recursive: true });

const packages = ['types', 'config', 'utils', 'sdk'];
const packed = {};

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
}

try {
  for (const packageDir of packages) {
    const fullDir = join(root, 'packages', 'ts', packageDir);
    const manifest = JSON.parse(readFileSync(join(fullDir, 'package.json'), 'utf8'));
    const before = new Set(readdirSync(tarballsDir));

    run('pnpm', ['--dir', fullDir, 'pack', '--pack-destination', tarballsDir]);

    const created = readdirSync(tarballsDir).filter((entry) => !before.has(entry));
    if (created.length !== 1) {
      throw new Error(`Expected one tarball for ${manifest.name}, found ${created.length}`);
    }
    packed[manifest.name] = join(tarballsDir, created[0]);
  }

  const dependencies = Object.fromEntries(
    Object.entries(packed).map(([name, tarball]) => [
      name,
      `file:${relative(appDir, tarball).replaceAll('\\', '/')}`,
    ]),
  );

  writeFileSync(
    join(appDir, 'package.json'),
    `${JSON.stringify({ name: 'captar-external-install-smoke', private: true, type: 'module', dependencies }, null, 2)}\n`,
  );

  run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund'], { cwd: appDir });

  writeFileSync(
    join(appDir, 'smoke.mjs'),
    `import { createCaptar } from '@captar/sdk';\n\nconst captar = createCaptar({ project: 'external-install-smoke' });\nconst session = await captar.startSession({ budget: { maxSpendUsd: 1 } });\nif (!session) throw new Error('Captar session was not created');\nawait session.close();\nawait captar.flush();\nconsole.log('External @captar/sdk install smoke passed');\n`,
  );

  run('node', ['smoke.mjs'], { cwd: appDir });

  const sdkTarball = packed['@captar/sdk'];
  if (!sdkTarball) throw new Error('SDK tarball was not created');
  console.log(`Verified ${basename(sdkTarball)} from a clean npm consumer project.`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
