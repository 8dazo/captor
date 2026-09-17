<p align="center">
  <img src="apps/marketing/public/logo.png" width="112" height="112" alt="Captor" />
</p>

<h1 align="center">Captor</h1>

<p align="center">
  <strong>Put hard boundaries around production work.</strong>
</p>

<p align="center">
  Execution contracts for backfills, migrations, reconciliation jobs, cron tasks, syncs, queue workers, and other risky background work.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/captar"><img src="https://img.shields.io/npm/v/captar?style=flat-square&label=npm" alt="npm" /></a>
  <a href="https://github.com/8dazo/captor/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/8dazo/captor/ci.yml?branch=main&style=flat-square&label=CI" alt="CI" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-Apache%202.0-blue.svg?style=flat-square" alt="Apache 2.0" /></a>
</p>

Captor 1.0 is a local-first execution-safety runtime. It lets code declare what a run may consume, where it can safely resume, and what must be true before the run counts as successful.

**No Captor account, proxy, daemon, or hosted backend is required.** Keep your existing scheduler, queue, workflow engine, database client, and deployment system.

> The product is **Captor**. The npm package is currently published as [`captar`](https://www.npmjs.com/package/captar).

## Why Captor

A script can exit with code `0` after writing too many rows. A retry can repeat a side effect. A backfill can die after processing 80% of its input and leave no trustworthy resume point. A workflow engine can schedule the work without knowing whether the work itself stayed inside its intended operating envelope.

Captor adds an **execution contract** around the code you already run:

- **Hard resource ceilings** for arbitrary resources such as `db.writes`, `http.requests`, `emails.sent`, `rows.processed`, or `usd`.
- **Reserve / commit / release accounting** so capacity can be checked before a risky side effect starts.
- **Deadlines and an AbortSignal** for cooperative cancellation.
- **Checkpoints** that are recorded only after successful work.
- **Durable resume** for backfills using a local receipt store.
- **Outcome assertions** so success can mean more than “the callback returned.”
- **Execution receipts** containing resource usage, metrics, checkpoints, status, and violations.
- **Adapters** for bounded `fetch` calls and common Prisma writes.

Captor is deliberately not a scheduler or workflow engine. Use it inside cron, BullMQ, Temporal, Trigger.dev, GitHub Actions, a Kubernetes Job, or a plain Node process.

## Install

```bash
npm install captar
```

Captor 1.0 supports **Node.js 22+**. The release pipeline tests the oldest supported LTS line (Node 22) and Node 24 LTS. SQLite persistence uses Node's built-in `node:sqlite` module, so no native database dependency is required.

## 60-second example

Captor 1.0 exports the execution API directly from the package root:

```ts
import { run } from 'captar';

const result = await run(
  'customer-repair',
  {
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
  },
  async (execution) => {
    const write = execution.reserve('db.writes', 1);
    try {
      await updateCustomer();
      execution.commit(write);
    } catch (error) {
      execution.release(write);
      throw error;
    }

    execution.count('records.processed');
    execution.metric('error.rate', 0);
    execution.checkpoint('customer-id', 'cus_123');

    return 'done';
  },
);

console.log(result.receipt);
```

If admitting a reservation would exceed a configured resource limit, Captor throws a `ContractViolationError` before that guarded side effect begins. If the callback returns normally but an outcome assertion fails, the run still fails its contract.

## Safe backfills

`backfill()` adds batching, preflight resource reservation, post-success checkpoints, local persistence, dry runs, and resume behavior:

```ts
import { backfill, JsonlRunStore } from 'captar';

const store = new JsonlRunStore(); // .captor/runs.jsonl

const result = await backfill({
  name: 'users-v2',
  source: users,
  batchSize: 500,
  resume: true,
  store,
  contract: {
    limits: {
      resources: {
        'db.writes': 25_000,
      },
    },
  },
  resource: 'db.writes',
  resourceAmount: (batch) => batch.length,
  process: async (batch) => {
    await updateUsers(batch);
  },
});

console.log(result.receipt.checkpoints['backfill.cursor']);
```

The configured resource is reserved before each batch runs and committed only after the batch succeeds. The default numeric checkpoint is written after successful processing, so `resume: true` can restart from the latest committed offset for the same backfill name. `startAt` is available when you want to supply an explicit offset yourself.

Use `dryRun: true` to enumerate batches without executing `process`.

## Durable local history

JSONL is the zero-dependency default:

```ts
import { JsonlRunStore, runStored } from 'captar';

const store = new JsonlRunStore({ path: '.captor/runs.jsonl' });

await runStored(
  'daily-reconciliation',
  { limits: { resources: { 'http.requests': 1_000 } } },
  async (execution) => {
    // work
  },
  store,
);
```

Use a single-file SQLite store when you want indexed local history:

```ts
import { SqliteRunStore } from 'captar';

const store = new SqliteRunStore({ path: '.captor/runs.sqlite' });
```

Captor's CI includes a fresh-process SQLite smoke: one Node process stops at a hard write boundary, a second process opens the same database, resumes from the last committed checkpoint, and preserves the final receipt.

## Local CLI

The npm package installs the `captor` CLI.

```bash
# JSONL default: .captor/runs.jsonl
npx captor runs
npx captor inspect <run-id>

# SQLite
npx captor runs --file .captor/runs.sqlite
npx captor inspect <run-id> --file .captor/runs.sqlite
```

## Prisma write guards

Common Prisma writes can be metered without manually calling `consume()` around every mutation:

```ts
import { createPrismaQueryGuard, run } from 'captar';

await run(
  'repair-customers',
  { limits: { resources: { 'db.writes': 5_000 } } },
  async (execution) => {
    const guardedPrisma = prisma.$extends({
      query: {
        $allModels: {
          $allOperations: createPrismaQueryGuard(execution),
        },
      },
    });

    await guardedPrisma.customer.create({ data: customer });
  },
);
```

Single-row `create`, `update`, `upsert`, and `delete` operations reserve one write before execution. `createMany` and `createManyAndReturn` reserve the input row count.

`updateMany`, `updateManyAndReturn`, and `deleteMany` are **blocked by default** because Prisma cannot reveal their affected-row count before the mutation executes. This fail-closed behavior preserves a real preflight ceiling. Prefer bounded batches; opt into `unboundedBulk: 'allow-unmetered'` only when you intentionally accept that limitation.

Raw SQL, custom transaction logic, or database work performed outside the guarded client is not automatically metered.

## Bounded HTTP calls

```ts
import { boundedFetch, run } from 'captar';

await run(
  'partner-sync',
  { limits: { resources: { 'http.requests': 100 } } },
  async (execution) => {
    const fetch = boundedFetch(execution);
    await fetch('https://example.com/api/items');
  },
);
```

Each attempted request reserves capacity before it starts and commits that attempt when the fetch settles. Captor also combines the execution AbortSignal with a caller-supplied fetch signal.

## Safety model and boundaries

Captor enforces limits at the boundaries you route through Captor. That distinction matters:

- A `reserve()` call is checked before Captor admits the guarded operation.
- Work that bypasses Captor cannot be counted or blocked automatically.
- `durationMs` aborts the execution signal and fails the contract, but arbitrary user code must cooperate with cancellation to stop immediately.
- Captor does not roll back side effects that already happened; use transactions or idempotency where your system requires them.
- Checkpoints describe committed application progress. Your `process` function should only return after the corresponding batch is safe to consider complete.

The goal is deterministic execution policy around application work—not pretending a JavaScript library is an operating-system sandbox.

## Public API in 1.0

The documented 1.0 surface follows semantic versioning:

| Import | Purpose |
| --- | --- |
| `captar` | Primary API: execution contracts, backfills, stores, adapters, plus the compatibility AI runtime |
| `captar/execution` | Execution-only compatibility entrypoint |
| `captar/execution/backfill` | Backfill helpers |
| `captar/execution/store` | JSONL/SQLite stores and `runStored` |
| `captar/execution/fetch` | `boundedFetch` |
| `captar/execution/prisma` | Prisma query guard |

Private implementation files are intentionally not exported through a wildcard path.

## Execution model

```text
existing runner
cron / BullMQ / Temporal / Trigger / script
                 │
                 ▼
          ┌───────────────┐
          │ Captor        │
          │               │
          │ limits        │
          │ reservations  │
          │ checkpoints   │
          │ outcomes      │
          └───────┬───────┘
                  │ allowed
                  ▼
            application work
                  │
                  ▼
          execution receipt
```

Resources are application-defined strings. Captor does not force a fixed cost model.

## Existing AI runtime

The pre-1.0 OpenAI-compatible API remains available for compatibility:

```ts
import { createCaptar } from 'captar';
```

Existing model-call budgets, tool policies, provider wrappers, and telemetry remain supported. They are now treated as an adapter/use case of the broader execution-safety runtime rather than the product's core identity.

If you already use that API, read [`docs/product/migrate-from-ai-runtime.md`](docs/product/migrate-from-ai-runtime.md). Captor 1.0 adds the execution API without requiring existing AI integrations to migrate immediately.

## Hosted platform

The runtime is fully useful locally. The hosted platform is optional and is organized around shared Runs, Contracts, Backfills, violations, checkpoints, and receipts for teams that want a fleet-level view.

## Release quality

The release pipeline verifies the package as an external consumer rather than only testing it inside the monorepo. A release candidate must pass:

- release metadata, version, changelog, and tag checks;
- lint and full tests;
- monorepo build;
- SDK/helper build;
- `npm pack` staging validation;
- clean npm install in a temporary project;
- TypeScript compilation against the packed declarations;
- root API + compatibility-subpath runtime smoke tests;
- legacy AI API compatibility smoke;
- fresh-process SQLite resume + CLI smoke;
- Node 22 and Node 24 LTS compatibility before publish.

See [`CHANGELOG.md`](CHANGELOG.md) for release notes.

## Repository

```text
captor/
├── apps/
│   ├── platform/       # optional hosted run/control layer
│   └── marketing/      # website and docs
├── packages/ts/
│   ├── core/           # execution runtime source
│   ├── sdk/            # published `captar` package
│   ├── config/
│   ├── types/
│   ├── utils/
│   └── ui/
├── demo/               # production-safety and compatibility demos
├── docs/product/       # product and migration docs
├── docs/sdk/           # AI compatibility engineering docs
├── db/prisma/
└── .github/workflows/
```

## Local development

Requirements: Node.js 22+, pnpm 10, and PostgreSQL only when working on the hosted platform.

```bash
git clone https://github.com/8dazo/captor.git
cd captor
pnpm install
pnpm lint
pnpm test
pnpm build
node scripts/smoke-sdk-package.mjs
node scripts/smoke-sqlite-resume.mjs
```

## Contributing

Read [`CONTRIBUTING.md`](CONTRIBUTING.md) and [`DEVELOPMENT.md`](DEVELOPMENT.md). Runtime behavior changes should include focused tests and should preserve the external package smoke.

## Security

Follow [`SECURITY.md`](SECURITY.md) for responsible disclosure. Never publish credentials or sensitive production payloads in issues or execution receipts.

## License

Apache License 2.0. See [`LICENSE`](LICENSE).
