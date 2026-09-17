# Migrating from the AI-first Captor runtime

Captor is being remodeled from an AI-specific budget/guardrail SDK into a general execution-safety runtime for production work.

The existing AI API remains available for compatibility. You do not need to migrate an existing OpenAI integration immediately.

## What changed

Before the product reset, the package root focused on AI sessions, provider wrappers, spend budgets, tool policies, traces, and hosted ingestion:

```ts
import { createCaptar } from 'captar';

const captar = createCaptar({ project: 'checkout-agent' });
const session = await captar.startSession({
  budget: { maxSpendUsd: 0.25 },
});
```

The new primary runtime is provider-neutral and lives at `captar/execution`:

```ts
import { run } from 'captar/execution';

const result = await run(
  'customer-backfill',
  {
    limits: {
      durationMs: 10 * 60_000,
      resources: {
        'db.writes': 5_000,
        'http.requests': 1_000,
      },
    },
    outcome: {
      'records.processed': { min: 4_900 },
      'error.rate': { max: 0.01 },
    },
  },
  async (execution) => {
    // application work
  },
);
```

## Concept mapping

| AI-first Captor | Execution-contract Captor |
| --- | --- |
| session budget | execution resource limits |
| call reservation | generic resource reservation |
| provider spend | optional `usd` or provider-specific resource |
| tool policy | side-effect/resource policy (expanding) |
| trace | execution receipt / run evidence |
| runtime violation | contract violation |
| session close | execution completion + outcome verification |
| OpenAI wrapper | optional adapter |

The important change is that model calls are no longer the unit Captor is built around. The unit is a **production execution**.

## Existing AI applications

Existing code can continue to use the package root:

```ts
import { createCaptar } from 'captar';
```

That compatibility API continues to provide OpenAI-compatible wrapping, spend accounting, call/tool policies, and existing hosted telemetry while adapters are moved onto the generic execution core.

For new non-AI work, use:

```ts
import { run, backfill } from 'captar/execution';
```

## Moving an AI budget to a generic contract

An old session budget like:

```ts
await captar.startSession({
  budget: { maxSpendUsd: 2 },
  policy: {
    call: { maxCallsPerSession: 20 },
  },
});
```

maps conceptually to:

```ts
import { run } from 'captar/execution';

await run(
  'research-job',
  {
    limits: {
      resources: {
        usd: 2,
        'model.calls': 20,
      },
    },
  },
  async (execution) => {
    // An adapter can reserve/commit these resources around model calls.
  },
);
```

Do not manually duplicate accounting around the legacy wrapper merely to migrate. Keep the existing wrapper until the corresponding provider adapter is available on the new core.

## Backfills and data fixes

New production-data work should start on the new API directly:

```ts
import { backfill } from 'captar/execution';

await backfill({
  name: 'users-v2',
  source: users,
  batchSize: 500,
  contract: {
    limits: {
      resources: {
        'db.writes': 25_000,
      },
    },
  },
  resource: 'db.writes',
  resourceAmount: (batch) => batch.length,
  checkpoint: (_batch, context) => context.processed,
  process: async (batch) => updateUsers(batch),
});
```

This is the path that receives new product investment: local-first contracts, bounded backfills, persisted checkpoints, execution receipts, and adapters for ordinary production infrastructure.

## Hosted platform

The local execution runtime does not require Captor Cloud. Hosted ingestion remains optional and is transitioning from AI trace/eval terminology toward shared runs, contracts, violations, checkpoints, receipts, and organization controls.

## Migration rule

- Existing AI integration working today: **leave it working**.
- New production job/backfill: **use `captar/execution`**.
- Shared semantics needed across both: model the constraint as a generic resource or outcome requirement.
- Do not move code merely to match the new marketing story; migrate when the generic runtime improves the application.
