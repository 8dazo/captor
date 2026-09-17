# Changelog

All notable changes to the public `captar` package are documented here.

Captor follows semantic versioning for the documented public API beginning with 1.0.0.

## [1.0.0] - 2026-09-17

### New product core

- Promotes Captor from an AI-specific runtime guard to a local-first execution-safety runtime for production backfills and background work.
- Adds execution contracts with arbitrary hard resource limits, deadlines, checkpoints, outcome assertions, and execution receipts.
- Adds reserve / commit / release accounting so guarded capacity can be checked before a side effect starts and reconciled afterward.
- Exports the execution API directly from `captar` while retaining `captar/execution` and focused execution subpaths.

### Backfills and recovery

- Adds first-class `backfill()` batching with preflight resource reservations and post-success checkpoints.
- Adds `dryRun`, explicit `startAt`, and automatic persisted `resume: true` behavior.
- Adds zero-dependency JSONL receipt/checkpoint persistence.
- Adds SQLite persistence using the built-in `node:sqlite` runtime.
- Adds a fresh-process recovery test that stops one process at a resource boundary and resumes a second process from the same SQLite database without reprocessing committed rows.

### Instrumentation

- Adds `boundedFetch()` for resource-limited HTTP attempts with combined cancellation signals.
- Adds `createPrismaQueryGuard()` for common Prisma mutations.
- Single-row Prisma writes reserve one `db.writes` unit by default.
- `createMany` and `createManyAndReturn` reserve the input row count.
- Unbounded `updateMany`, `updateManyAndReturn`, and `deleteMany` fail closed by default because their affected-row count cannot be known before execution.

### Local tooling

- Adds the `captor runs` and `captor inspect <run-id>` CLI commands.
- Adds JSONL and SQLite local history.
- Ignores the default `.captor/` local history directory in the repository.

### Packaging and stability

- Sets the public npm package and monorepo version to `1.0.0`.
- Makes the documented execution API available from the package root.
- Replaces wildcard execution exports with explicit stable subpaths:
  - `captar/execution`
  - `captar/execution/backfill`
  - `captar/execution/store`
  - `captar/execution/fetch`
  - `captar/execution/prisma`
- Keeps the existing OpenAI-compatible `createCaptar()` API available from the package root for backwards compatibility.
- Verifies the packed artifact by installing it into a clean temporary npm project and exercising both the new execution API and the legacy AI API.
- Type-checks a clean external TypeScript consumer against the packed declarations.
- Validates the supported Node 22 and Node 24 LTS lines before publish.
- Requires package version, monorepo version, release notes, changelog, export map, and release tag to agree before publishing.

### Documentation and product reset

- Rewrites the root README and npm README around production execution safety.
- Documents safety boundaries explicitly: Captor only controls work routed through its runtime/adapters, deadlines require cooperative cancellation, and already-committed side effects are not automatically rolled back.
- Repositions the hosted platform as optional shared history/control rather than a requirement for the local runtime.
- Keeps the AI runtime documented as a compatibility adapter/use case rather than the primary product identity.

### Compatibility notes

- Captor 1.0 requires Node.js 22 or newer. Node 18 and Node 20 were dropped because those runtime lines are end-of-life by the 1.0 release date.
- CI and release validation cover Node 22 and Node 24 LTS.
- Existing `createCaptar()` integrations do not need to migrate to execution contracts immediately, but they must run on a supported Node version when upgrading to Captor 1.0.
- The npm package name remains `captar`; the product name is Captor.

## [0.5.0] - 2026-09-14

- Published the TypeScript SDK as `captar`.
- Added registry-safe package staging and bundled internal helpers.
- Added the initial npm/GitHub release workflow.

[1.0.0]: https://github.com/8dazo/captor/compare/v0.5.0...v1.0.0
[0.5.0]: https://github.com/8dazo/captor/releases/tag/v0.5.0
