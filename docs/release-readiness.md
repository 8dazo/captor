# Release readiness

The repository SDK version is 1.0.0. Reliability changes under `Unreleased` are not automatically published to npm by a branch or website deployment. Use a separate matching package-version update and release tag when publishing them.

## SDK gates

1. Run repository lint/tests and build `@captar/types`, `@captar/config`, `@captar/utils`, `@captar/core`, then `captar`.
2. Run `node scripts/smoke-sdk-package.mjs`: pack the SDK, install it into a clean consumer, typecheck public exports, exercise execution and AI compatibility, and execute the public quickstart.
3. Run `node scripts/smoke-sqlite-resume.mjs` and `node demo/backfill-recovery.mjs`: verify recovery in fresh processes, application state, and CLI inspection.
4. CI repeats package and recovery checks on Node 22 and 24. The SDK runtime floor is Node 22; SQLite requires a release with built-in `node:sqlite`.
5. Publish only `captar`. Helper workspaces remain private and bundled. Publishing needs the repository's configured npm credentials and release workflow.

## Marketing gates

- Build content collections and the Next production application; verify homepage, quickstart, recovery docs, pricing, story, and existing AI compatibility routes.
- Keep package name `captar` and CLI binary `captor` explicit. Do not advertise unreleased fixes as already installed from npm.
- Main-only Git deployment is configured per application. Production verification requires the resulting Vercel deployment, not only a local build.

## Platform gates (database work paused)

- Verify the additive schema in `db/sql/231_execution_receipts.sql` before enabling authenticated receipt workflows; follow `docs/platform/execution-receipts.md`.
- Sign in, select a project, import a redacted receipt, inspect list/detail, download it, and verify another project's receipt is inaccessible.
- Confirm invalid input is rejected and imported running receipts remain read-only snapshots.
- Required environment configuration includes `DATABASE_URL`, auth configuration, and public application URLs. Legacy AI ingest also requires its configured ingest URL and bearer key; retain its existing smoke coverage.
- Do not equate public health/login HTTP 200 with a database-backed authenticated smoke test.

## Pilot gate

Use [the pilot checklist](product/pilot-checklist.md) for three real workloads. Recruitment, pilot results, and hosted schema verification are pending until evidence is recorded.
