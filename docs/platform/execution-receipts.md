# Execution receipt inspector

Project **Runs** now uses genuine Captor execution receipts. **AI traces** remains available separately; existing trace URLs are unchanged.

## Import a real run

1. Run a script with `runStored` from `captar/execution/store` and `JsonlRunStore`, or save the `receipt` returned by `run` from `captar/execution` as JSON.
2. Open a project → Runs → Import receipts.
3. Select the receipt JSON or `.captor/runs.jsonl` file. JSON arrays are also accepted.
4. Open a run to inspect resources, violations, metrics and checkpoints; download the receipt to export it.

Import limits: 512 KB, 200 records per file. JSONL uses the last snapshot of each ID within the file. Existing project run IDs are skipped, not replaced. Import the completed history file when possible: a previously imported running snapshot remains immutable. Imports are visible to all project members and retain all checkpoint/raw receipt content; review it before sharing. This is manual import, not automatic SDK telemetry or live polling.

The receipt records aggregate committed/reserved usage, not individual reservation/release events. It does not include the contract definition, passing assertion results or resume lineage. The UI explicitly identifies these gaps. Captor does not remotely start, stop or resume jobs from this inspector.

## Database rollout

The new `ExecutionReceiptRecord` table is additive. Generate the Prisma client with `pnpm db:generate`. For a disposable development database, use the repository's existing `pnpm db:push` workflow. For an existing database, review and apply `db/sql/231_execution_receipts.sql` through the normal database change process before deploying the app. This repository currently has no migration baseline, so the SQL is deliberately not a standalone initial Prisma migration. No production schema changes are performed by this PR.

All list, detail and export queries include project membership. Import checks membership inside its transaction. Unauthenticated downloads return 401; unavailable or unauthorized receipts return 404. Downloads disable caching.
