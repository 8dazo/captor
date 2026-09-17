import { appendFileSync, cpSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(root, 'packages/ts/core/dist');
const sdkDist = resolve(root, 'packages/ts/sdk/dist');
const target = resolve(sdkDist, 'execution');

rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });
cpSync(source, target, { recursive: true });

// The core runtime keeps its implementation split across focused modules. The
// public Captor execution entrypoint should expose the complete stable V1 API.
const executionExports = [
  "export * from './backfill.js';",
  "export * from './store.js';",
  "export * from './fetch.js';",
  "export * from './prisma.js';",
].join('\n');
appendFileSync(resolve(target, 'index.js'), `\n${executionExports}\n`);
appendFileSync(resolve(target, 'index.d.ts'), `\n${executionExports}\n`);

// Captor 1.0 makes execution contracts first-class at the package root while
// preserving the existing AI runtime exports for backwards compatibility.
const rootExport = "export * from './execution/index.js';";
appendFileSync(resolve(sdkDist, 'index.js'), `\n${rootExport}\n`);
appendFileSync(resolve(sdkDist, 'index.d.ts'), `\n${rootExport}\n`);

console.log(`Copied execution runtime to ${target} and promoted the V1 API at package root`);
