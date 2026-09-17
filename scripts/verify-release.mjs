import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const packagePath = resolve(root, 'packages/ts/sdk/package.json');
const changelogPath = resolve(root, 'CHANGELOG.md');
const packageReadmePath = resolve(root, 'packages/ts/sdk/README.md');

const pkg = JSON.parse(readFileSync(packagePath, 'utf8'));
const changelog = readFileSync(changelogPath, 'utf8');
const packageReadme = readFileSync(packageReadmePath, 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(pkg.name === 'captar', `Expected package name captar, got ${pkg.name}`);
assert(
  /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(pkg.version),
  `Package version is not valid release semver: ${pkg.version}`,
);
assert(pkg.publishConfig?.access === 'public', 'captar must publish with public access');
assert(pkg.bin?.captor === './dist/cli.js', 'captor CLI bin mapping is missing or changed');
assert(pkg.engines?.node === '>=18', 'Captor 1.x baseline must remain explicit as Node >=18');
assert(pkg.files?.includes('dist'), 'Published package must include dist');
assert(pkg.files?.includes('README.md'), 'Published package must include README.md');

const expectedExports = [
  '.',
  './execution',
  './execution/backfill',
  './execution/store',
  './execution/fetch',
  './execution/prisma',
];
for (const entry of expectedExports) {
  assert(pkg.exports?.[entry], `Missing stable package export: ${entry}`);
}
for (const entry of Object.keys(pkg.exports ?? {})) {
  assert(!entry.includes('*'), `Release export map must not expose wildcard internals: ${entry}`);
}

assert(
  changelog.includes(`## [${pkg.version}]`),
  `CHANGELOG.md does not contain an entry for ${pkg.version}`,
);
assert(
  packageReadme.includes(`# Captor ${pkg.version.split('.')[0]}.0`),
  `Package README does not identify the ${pkg.version.split('.')[0]}.0 release line`,
);

const refType = process.env.GITHUB_REF_TYPE;
const refName = process.env.GITHUB_REF_NAME;
const expectedVersion = process.env.EXPECTED_VERSION;
if (expectedVersion) {
  assert(
    pkg.version === expectedVersion,
    `Package version ${pkg.version} does not match EXPECTED_VERSION=${expectedVersion}`,
  );
}
if (refType === 'tag' || refName?.startsWith('v')) {
  assert(refName === `v${pkg.version}`, `Tag ${refName} does not match package version ${pkg.version}`);
}

console.log(`Release metadata verified for ${pkg.name}@${pkg.version}`);
