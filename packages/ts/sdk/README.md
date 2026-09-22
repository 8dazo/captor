# Captor 1.0

**Put hard boundaries around production work.**

Captor is a local-first execution-safety runtime for backfills, migrations, reconciliation jobs, cron tasks, syncs, queue workers, and other risky background work.

The product is **Captor**; the npm package is published as **`captar`**.

No Captor account, proxy, daemon, or hosted backend is required.

## Install

```bash
npm install captar
```

Captor 1.0 supports **Node.js 22+**. The release pipeline validates Node 22 and Node 24 LTS. SQLite storage uses Node's built-in `node:sqlite` module and requires no native dependency.

## Execution contracts

Captor 1.0 exports execution primitives directly from the package root:

```ts
import { run } from 'captar';

const customers = [{ id: 1 }, { id: 2 }, { id: 3 }];
const repaired = new Set();
const result = await run(
  'customer-repair',
  {
    limits: { resources: { 'db.writes': 3 } },
    outcome: { 'records.processed': { equals: customers.length } },
  },
  async (execution) => {
    for (const customer of customers) {
      const write = execution.reserve('db.writes', 1);
      // Replace this local operation with an awaited, idempotent database write.
      repaired.add(customer.id);
      execution.commit(write);
      execution.checkpoint('customer-id', customer.id);
    }
    execution.metric('records.processed', repaired.size);
  }
);
console.log(result.receipt);
```

A resource reservation that would cross a configured ceiling fails with `ContractViolationError` before Captor admits the guarded operation. A callback that returns normally can still fail when its outcome assertions are not satisfied.

## Backfills

```ts
import { backfill, JsonlRunStore } from 'captar';

const result = await backfill({
  name: 'users-v2',
  source: users,
  batchSize: 500,
  resume: true,
  store: new JsonlRunStore(),
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

console.log(result.receipt);
```

Captor reserves the configured resource before a batch executes and records the default numeric checkpoint only after the batch succeeds. `resume: true` restores the latest numeric checkpoint for the same backfill name. `startAt` takes precedence when you provide an explicit offset. `dryRun: true` previews batches without executing `process`.

## Durable local history

JSONL is the zero-dependency default:

```ts
import { JsonlRunStore } from 'captar';

const store = new JsonlRunStore({ path: '.captor/runs.jsonl' });
```

Use SQLite for indexed single-file history:

```ts
import { SqliteRunStore } from 'captar';

const store = new SqliteRunStore({ path: '.captor/runs.sqlite' });
```

Both stores implement the same `RunStore` interface and can be passed to `backfill()` or `runStored()`.

## CLI

The package installs the `captor` binary:

```bash
npx --package=captar captor runs
npx --package=captar captor inspect <run-id>

npx --package=captar captor runs --file .captor/runs.sqlite
npx --package=captar captor inspect <run-id> --file .captor/runs.sqlite
```

The default history path is `.captor/runs.jsonl`.

## Prisma write guarding

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
  }
);
```

Single-row `create`, `update`, `upsert`, and `delete` reserve one write. `createMany` and `createManyAndReturn` reserve the input row count.

`updateMany`, `updateManyAndReturn`, and `deleteMany` fail closed by default because Prisma cannot reveal the affected-row count before execution. Use bounded batches when the hard ceiling matters. `unboundedBulk: 'allow-unmetered'` is an explicit escape hatch, not a metering guarantee.

Raw SQL, custom transactions, and work performed outside the guarded Prisma client are not automatically counted.

## Bounded fetch

```ts
import { boundedFetch, run } from 'captar';

await run(
  'partner-sync',
  { limits: { resources: { 'http.requests': 100 } } },
  async (execution) => {
    const fetch = boundedFetch(execution);
    await fetch('https://example.com/api/items');
  }
);
```

Each attempted request reserves capacity before it begins and commits the attempt after `fetch` settles. The execution AbortSignal is combined with any caller-supplied signal.

## Safety boundaries

- Captor can only enforce resources routed through Captor or one of its adapters.
- `durationMs` fails the contract and aborts the provided signal; arbitrary application code must cooperate with cancellation to stop immediately.
- Captor does not undo side effects that already occurred. Use transactions and idempotency where required.
- A backfill checkpoint should represent work that is safe to consider committed.

Captor is an execution-policy layer, not an operating-system sandbox or workflow engine.

## Stable 1.0 entrypoints

```text
captar
captar/execution
captar/execution/backfill
captar/execution/store
captar/execution/fetch
captar/execution/prisma
```

The package root is the preferred 1.0 API. The execution subpaths remain supported for focused imports and compatibility. Undocumented execution internals are not exported through a wildcard path.

## Existing AI runtime

The pre-1.0 OpenAI-compatible API remains available from the same package root:

```ts
import { createCaptar } from 'captar';
```

Existing model-call budgets, provider wrappers, tool policies, and telemetry continue to work. They are compatibility/adaptor functionality; Captor's primary 1.0 identity is production execution safety.

Migration and architecture docs live in the repository:

- `docs/product/migrate-from-ai-runtime.md`
- `docs/product/execution-contracts-v1.md`

## Hosted platform

The local runtime does not require Captor Cloud. The hosted platform is optional and provides shared execution history and control-plane views for teams.

Repository: https://github.com/8dazo/captor

## Verify recovery locally

From a repository checkout, build the helper workspaces and run the demos:

```bash
pnpm --filter @captar/types build
pnpm --filter @captar/config build
pnpm --filter @captar/utils build
pnpm demo:quickstart
pnpm demo:backfill
```

The recovery demo stops after four records, resumes two in a new process, and independently verifies all six records and the saved receipts. Production writes still need idempotency and stable source ordering. Each resumed invocation starts a fresh budget.

The `Unreleased` changelog describes additional failure-receipt fixes in this checkout. Check the installed package version before relying on these changes; they are not published by running a demo.
