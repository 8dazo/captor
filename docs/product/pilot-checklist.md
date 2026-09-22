# Execution-contract pilot

Goal: evaluate Captor with three developers, each using one real backfill, repair, or reconciliation job. Recruitment and completed pilots are pending; this document records a procedure, not user results.

## Before the first run

- Record the SDK version, Node version (22+), job purpose, runner, resource names, and expected outcome.
- Use a small representative dataset and an isolated target. Record the expected record IDs or aggregate result before running.
- Define stable source ordering and a unique run name for this dataset/job version. The built-in resume cursor is an item offset, not a database primary key.
- Make writes idempotent or use an application transaction. Checkpoint persistence and application writes are separate operations.
- Set a deliberately low resource ceiling and choose safe checkpoint values. Receipts must not contain credentials or customer payloads before sharing.

## Demonstration (about two minutes after setup)

1. Run `pnpm demo:quickstart` from a built checkout: three writes, three reported records, succeeded receipt.
2. Run `pnpm demo:backfill`: the first process stops at four items, a new process handles two more, and an independent verifier checks all six IDs.
3. Read the CLI output: failed run with cursor 4 and succeeded run with cursor 6. The demo prints its local evidence directory.
4. Explain the boundary: this is a controlled stop and restart, not atomic crash recovery across a database and receipt file.

## Real workload acceptance

- A reservation over the ceiling prevents its guarded side effect.
- A complete batch saves a checkpoint only after successful processing.
- An injected error halfway through a batch leaves the last completed checkpoint unchanged; a retry replays that batch without duplicate business effects.
- A failed store write stops further processing. Inspect application state before retrying; do not assume the newest in-memory checkpoint was durable.
- Each resumed invocation uses a fresh budget. Apply a separate application-level limit if the job needs a lifetime ceiling.
- Verify the business result independently of Captor's receipt: exact IDs, counts, checksums, or invariant queries.
- Run the job a second time and confirm expected repeat behavior. Record where instrumentation or recovery was confusing.

## Evidence log

| Pilot                 | Workload | First run | Failure/retry | Independent outcome | Repeat use |
| --------------------- | -------- | --------- | ------------- | ------------------- | ---------- |
| Developer 1 (pending) | Pending  | Pending   | Pending       | Pending             | Pending    |
| Developer 2 (pending) | Pending  | Pending   | Pending       | Pending             | Pending    |
| Developer 3 (pending) | Pending  | Pending   | Pending       | Pending             | Pending    |

Capture setup time, code changes needed, failures discovered, and whether the developer chooses Captor for a second job. Link only redacted receipts and minimal reproductions. Open follow-up issues for observed problems; no outreach is performed by this checklist.
