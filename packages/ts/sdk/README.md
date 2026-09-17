# Captor 1.0

**Put hard boundaries around production work.**

Captor is a local-first execution-safety runtime for backfills, migrations, reconciliation jobs, cron tasks, syncs, queue workers, and other risky background work.

The product is **Captor**; the npm package is published as **`captar`**.

No Captor account, proxy, daemon, or hosted backend is required.

## Install

```bash
npm install captar
```

Node.js 18+ is supported for the main execution runtime. The optional SQLite store requires Node.js 22+ because it uses the built-in `node:sqlite` module.

## Execution contracts

Captor 1.0 exports execution primitives directly from the package root:

```ts
import { run } from 'captar';

const result = await run(
  'customer-backfill',
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
    const reservation = execution.reserve('db.writes', 1);
    try {
      await updateCustomer();
      execution.commit(reservation);
    } catch (error) {
      execution.release(reservation);
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

JSONL is the zero-dependency default and works across Captor's normal Node 18+ range:

```ts
import { JsonlRunStore } from 'captar';

const store = new JsonlRunStore({ path: '.captor/runs.jsonl' });
```

Node 22+ can use SQLite:

```ts
import { SqliteRunStore } from 'captar';

const store = new SqliteRunStore({ path: '.captor/runs.sqlite' });
```

Both stores implement the same `RunStore` interface and can be passed to `backfill()` or `runStored()`.

## CLI

The package installs the `captor` binary:

```bash
npx captor runs
npx captor inspect <run-id>

npx captor runs --file .captor/runs.sqlite
npx captor inspect <run-id> --file .captor/runs.sqlite
```

The default history path is `.captor/runs.jsonl`. SQLite CLI access requires Node 22+.

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
  },
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
  },
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
