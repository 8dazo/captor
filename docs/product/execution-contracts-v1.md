# Captor Execution Contracts — V1 Build Plan

Status: active implementation
Branch: `feat/execution-contracts-v1`

## Product thesis

Captor makes risky production work safe to run.

The initial wedge is production backfills, data fixes, reconciliation jobs, cron jobs, syncs, and other asynchronous work that can run too long, repeat side effects, overwhelm dependencies, or report success without accomplishing the intended outcome.

Captor is not a workflow engine. It does not schedule or host jobs. It wraps work that already runs in a Node process, cron, BullMQ, Trigger.dev, Temporal, GitHub Actions, or another execution system.

The core abstraction is an **execution contract**:

1. what a run is allowed to consume;
2. what side effects it is allowed to perform;
3. where it can safely resume;
4. what must be true for the run to count as successful;
5. a receipt describing what actually happened.

The core must remain fully useful without Captor Cloud.

## V1 positioning

**Put boundaries around production work.**

Captor adds hard limits, checkpoints, and outcome checks to backfills and background jobs without requiring a new workflow engine.

Initial installation target:

```bash
pnpm add captar
```

Initial API direction:

```ts
await captor.run('customer-backfill', {
  limits: {
    durationMs: 20 * 60_000,
    resources: {
      'db.writes': 25_000,
      'stripe.requests': 500,
    },
  },
  outcome: {
    'records.processed': { min: 20_000 },
    'error.rate': { max: 0.01 },
  },
}, async (run) => {
  // application code
});
```

## Non-goals for V1

- replacing Temporal, Trigger.dev, BullMQ, DBOS, or other workflow engines;
- hosted scheduling;
- enterprise RBAC;
- rebuilding the current dashboard;
- generic observability;
- requiring a Captor account or hosted backend;
- promising exactly-once execution across arbitrary external systems.

## Architecture

The new implementation is split from the existing AI-oriented SDK.

```text
packages/ts/core/
  execution contracts
  resource ledger
  reserve / commit / release
  counters
  deadlines
  outcome assertions
  execution receipts

packages/ts/backfill/        # next slice
  batching
  checkpoints
  resumability
  throttling
  dry-run support

packages/ts/store-sqlite/    # later V1
  local persistent runs
  checkpoints
  receipts

packages/ts/adapter-fetch/   # later V1
packages/ts/adapter-prisma/  # later V1
packages/ts/adapter-bullmq/  # later
packages/ts/adapter-openai/  # current AI functionality eventually moves behind adapter boundary
```

## Core semantics

### Resource accounting

Every resource is an arbitrary string chosen by the application, for example:

- `db.writes`
- `stripe.requests`
- `emails.sent`
- `rows.processed`
- `browser.sessions`
- `llm.tokens`
- `usd`

The engine supports:

- `consume(resource, amount)` for immediate consumption;
- `reserve(resource, amount)` before a risky operation;
- `commit(reservation, actualAmount?)` after execution;
- `release(reservation)` when reserved capacity is unused.

Reservations count against the limit immediately. Actual committed usage is never silently clamped.

### Deadline

A run may define `durationMs`. Captor exposes an `AbortSignal` and aborts the run when the deadline is reached. Cooperative cancellation remains the responsibility of underlying APIs.

### Outcome assertions

At completion, application code can report metrics and Captor evaluates declared assertions:

- `{ min }`
- `{ max }`
- `{ equals }`

A process that returns normally can still fail its execution contract.

### Receipt

Every run produces an in-memory receipt containing:

- run id;
- name;
- status;
- start/end timestamps;
- committed resource usage;
- reported metrics;
- checkpoints;
- violations.

A storage abstraction will follow after the core semantics are stable.

## Milestones

### M0 — Product reset

- [x] create implementation branch
- [x] save product/build plan in repository
- [ ] create generic core package
- [ ] tests for accounting and assertions

### M1 — Core execution contract

- [ ] `run()` API
- [ ] arbitrary resource limits
- [ ] reserve / commit / release
- [ ] immediate consumption
- [ ] deadline + AbortSignal
- [ ] outcome metrics/assertions
- [ ] execution receipt
- [ ] contract violation errors
- [ ] no network/backend dependency

Exit criteria: all semantics are deterministic under unit tests and the package can be consumed independently of the AI SDK.

### M2 — Backfill wedge

- [ ] `@captar/backfill`
- [ ] iterable/async-iterable batching
- [ ] checkpoint key after committed batch
- [ ] resume from checkpoint
- [ ] concurrency control
- [ ] per-second throttling
- [ ] dry-run hook
- [ ] example: Prisma/Postgres customer backfill

Exit criteria: stop a deliberately broken backfill at a hard write limit, fix the code, resume from checkpoint, and verify the final outcome.

### M3 — Local persistence

- [ ] storage interface
- [ ] SQLite implementation
- [ ] durable checkpoints
- [ ] local execution history
- [ ] `captor runs` CLI
- [ ] `captor inspect <run>` CLI

Exit criteria: kill and restart a local process and continue a backfill without Captor Cloud.

### M4 — Automatic instrumentation

- [ ] `fetch` adapter with request counters
- [ ] Prisma/Postgres write counters
- [ ] BullMQ adapter
- [ ] preserve OpenAI support as an optional adapter

Exit criteria: a developer can add useful limits without manually incrementing every common resource.

### M5 — Validation

Do not expand the platform until real users validate the wedge.

Target conversations: teams that recently ran a production backfill, data fix, reconciliation job, migration, or high-risk sync.

Ask for the last real script they ran and learn:

- how it was throttled;
- how they stopped it;
- how they resumed it;
- how they verified completion;
- what incident they were afraid of;
- what actually went wrong.

Primary product metric: **production executions protected by a Captor contract**.

Strongest evidence: teams repeatedly refuse to run risky production jobs without Captor.

## Launch demo

The first public demo should be non-AI:

1. create 100,000 fake customer records;
2. run a deliberately buggy backfill that repeats writes;
3. without Captor, the script continues until manually killed;
4. with Captor, it stops exactly at the configured write ceiling;
5. repair the bug;
6. resume from the last committed checkpoint;
7. outcome verification catches missing rows;
8. the final receipt proves the completed work.

Only after this works cleanly should AI-agent execution be shown as another adapter/use case.

## Decision rule

Do not preserve old Captor features merely because they exist. Reuse implementation only when it strengthens the execution-contract thesis. The new core should remain valuable even if LLM APIs disappear completely.