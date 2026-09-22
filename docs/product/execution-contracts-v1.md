# Execution contracts: current scope

Captor's primary SDK surface is local execution accounting for production jobs. The npm package and import name are `captar`; the CLI binary is `captor`. Existing AI APIs remain available for compatibility.

## Implemented

- Arbitrary named resource limits; reserve, commit, release, consume, and count accounting.
- Checkpoints, cooperative deadlines, explicit abort, and outcome metrics.
- Batched backfills with dry run, numeric source offsets, per-batch persistence, and resume.
- JSONL and SQLite stores, plus CLI run history and receipt inspection.
- Fetch attempt accounting and documented top-level Prisma mutation accounting.
- Platform manual receipt import, list/detail inspection, and JSON download (PR #232).

## Reliability changes in this branch (unreleased)

Ordinary failed executions now retain final stored receipts. A final store failure exposes both execution state and the storage cause through `RunPersistenceError`. Recovery tests cover partial batches and failed persistence. The quickstart reports metrics correctly, and the repository demo verifies a fresh-process stop/resume cycle against independent application state.

## Boundaries

- Captor is not a scheduler or database transaction manager. Unwrapped side effects are not automatically counted.
- Resource limits apply per invocation; resumed runs start fresh budgets.
- Built-in resume requires stable source ordering and a numeric item offset. Application writes must tolerate replay after a partial batch or crash.
- An imported platform receipt is a snapshot, including when its recorded status is running. It cannot remotely control the job.
- Hosted alerts, approvals, organization-wide policies, and fleet controls are not implemented by this delivery.
- Platform schema rollout and authenticated import/list/detail/download verification remain deployment gates; the database work is paused.

## Next validation

Follow [the pilot checklist](pilot-checklist.md) with three real developers. Collect independent outcome checks and repeat-use evidence before expanding the product surface. Public npm publication requires a separate versioned release after the gates in [release readiness](../release-readiness.md).
