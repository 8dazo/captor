# Captor

**Put boundaries around production work.**

Captor is an open-source execution-safety runtime for backfills, migrations, reconciliation jobs, cron tasks, syncs, and other background work. Define what a run may consume, where it can checkpoint, and what must be true when it finishes.

The execution runtime works locally. No Captor account, proxy, or hosted backend is required.

## Install

```bash
npm install captar
```

## Execution contracts

```ts
import { run } from 'captar/execution';

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
    // Reserve capacity before a risky side effect.
    const reservation = execution.reserve('db.writes', 1);

    await updateCustomer();

    execution.commit(reservation);
    execution.count('records.processed');
    execution.metric('error.rate', 0);
    execution.checkpoint('customer-id', 'cus_123');

    return 'done';
  },
);

console.log(result.receipt);
```

A run that exceeds a hard resource limit is stopped with a `ContractViolationError`. A run that returns normally can still fail when its declared outcome is not satisfied.

## Backfills

The same runtime includes a batching helper for production data work:

```ts
import { backfill } from 'captar/execution';

const result = await backfill({
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
  process: async (batch) => {
    await updateUsers(batch);
  },
});

console.log(result.receipt);
```

Captor reserves the configured resource before a batch executes and records the checkpoint only after that batch succeeds. `dryRun: true` previews the work without executing `process`.

## Core semantics

- **Hard limits** — arbitrary resources such as `db.writes`, `http.requests`, `emails.sent`, `rows.processed`, or `usd`.
- **Reserve / commit / release** — reserve capacity before a side effect, reconcile actual usage afterward, and release unused capacity.
- **Deadlines** — a contract can expose a cooperative `AbortSignal` when `durationMs` expires.
- **Checkpoints** — attach resume information to the execution receipt.
- **Outcome assertions** — require metrics to satisfy `min`, `max`, or `equals` before a run counts as successful.
- **Receipts** — every run records limits, committed/reserved usage, metrics, checkpoints, status, and violations.

## What Captor is not

Captor is not a scheduler or workflow engine. Keep using cron, BullMQ, Temporal, Trigger.dev, GitHub Actions, or your existing process runner. Captor defines and enforces the safety contract around the work they execute.

## Existing OpenAI-compatible API

The pre-0.6 AI runtime remains available from the package root for compatibility:

```ts
import { createCaptar } from 'captar';
```

It continues to support model-call budgets, policies, OpenAI-compatible wrappers, tool tracking, and hosted telemetry. Going forward, model providers are treated as adapters/use cases of the broader execution-safety runtime rather than the core product identity.

## Hosted platform

Captor's execution runtime is local-first. The hosted platform is optional and is being reshaped around shared run history, contracts, violations, checkpoints, receipts, and organization-level controls.

Repository: https://github.com/8dazo/captor
