import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sdkDir = resolve(root, 'packages/ts/sdk');
const coreDir = resolve(root, 'packages/ts/core');
const outDir = resolve(sdkDir, '.publish');

const helpers = [
  { name: '@captar/types', dir: 'types', dependencies: undefined },
  { name: '@captar/config', dir: 'config', dependencies: { '@captar/types': '0.1.0' } },
  { name: '@captar/utils', dir: 'utils', dependencies: undefined },
];

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const sdkPackage = JSON.parse(readFileSync(resolve(sdkDir, 'package.json'), 'utf8'));
sdkPackage.dependencies = {
  '@captar/config': '0.1.0',
  '@captar/types': '0.1.0',
  '@captar/utils': '0.1.0',
};
sdkPackage.bundledDependencies = helpers.map(({ name }) => name);
sdkPackage.exports = {
  ...sdkPackage.exports,
  './execution': {
    types: './dist/execution/index.d.ts',
    default: './dist/execution/index.js',
  },
  './execution/*': {
    types: './dist/execution/*.d.ts',
    default: './dist/execution/*.js',
  },
};

writeFileSync(resolve(outDir, 'package.json'), `${JSON.stringify(sdkPackage, null, 2)}\n`);
cpSync(resolve(sdkDir, 'README.md'), resolve(outDir, 'README.md'));
cpSync(resolve(sdkDir, 'dist'), resolve(outDir, 'dist'), { recursive: true });
cpSync(resolve(coreDir, 'dist'), resolve(outDir, 'dist', 'execution'), { recursive: true });

for (const helper of helpers) {
  const sourceDir = resolve(root, `packages/ts/${helper.dir}`);
  const sourcePackage = JSON.parse(readFileSync(resolve(sourceDir, 'package.json'), 'utf8'));
  const targetDir = resolve(outDir, 'node_modules', ...helper.name.split('/'));
  mkdirSync(targetDir, { recursive: true });

  const stagedPackage = {
    name: helper.name,
    version: sourcePackage.version,
    type: sourcePackage.type,
    main: sourcePackage.main,
    types: sourcePackage.types,
    exports: sourcePackage.exports,
    sideEffects: sourcePackage.sideEffects,
    engines: sourcePackage.engines,
    ...(helper.dependencies ? { dependencies: helper.dependencies } : {}),
  };

  writeFileSync(resolve(targetDir, 'package.json'), `${JSON.stringify(stagedPackage, null, 2)}\n`);
  cpSync(resolve(sourceDir, 'dist'), resolve(targetDir, 'dist'), { recursive: true });
}

console.log(`Staged ${sdkPackage.name}@${sdkPackage.version} at ${outDir}`);
