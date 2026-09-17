<p align="center">
  <img src="apps/marketing/public/logo.png" width="112" height="112" alt="Captor" />
</p>

<h1 align="center">Captor</h1>

<p align="center">
  <strong>Put boundaries around production work.</strong>
</p>

<p align="center">
  Hard limits, checkpoints, outcome checks, and execution receipts for backfills, migrations, reconciliation jobs, cron tasks, syncs, and other risky background work.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/captar"><img src="https://img.shields.io/npm/v/captar?style=flat-square&label=npm" alt="npm" /></a>
  <a href="https://github.com/8dazo/captor/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/8dazo/captor/ci.yml?branch=main&style=flat-square&label=CI" alt="CI" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-Apache%202.0-blue.svg?style=flat-square" alt="Apache 2.0" /></a>
</p>

## Why Captor

Production work is often executed by a plain script, cron job, queue worker, GitHub Action, or workflow engine. Those systems can make work run, but they do not give every execution a clear boundary for how much it may consume or what must be true when it finishes.

Captor adds an **execution contract** around work you already run:

- hard limits on arbitrary resources;
- reserve / commit / release accounting before risky side effects;
- cooperative deadlines;
- checkpoints for resumable work;
- outcome assertions so exit code `0` is not the only definition of success;
- an execution receipt containing usage, metrics, checkpoints, status, and violations.

Captor is not a scheduler or workflow engine. Keep using cron, BullMQ, Temporal, Trigger.dev, GitHub Actions, or your existing process runner.

The core runtime is local-first. **No Captor account, proxy, or hosted backend is required.**

## Install

```bash
npm install captar
```

## Quick start

The new execution runtime is published from the same `captar` package:

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
    const write = execution.reserve('db.writes', 1);
    await updateCustomer();
    execution.commit(write);

    execution.count('records.processed');
    execution.metric('error.rate', 0);
    execution.checkpoint('customer-id', 'cus_123');

    return 'done';
  },
);

console.log(result.receipt);
```

If a hard limit would be exceeded, Captor blocks the operation before its reservation is admitted. If the callback returns normally but an outcome assertion fails, the execution still fails its contract.

## Backfills

Captor includes a first-class batching helper for production data work:

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
  process: async (batch) => {
    await updateUsers(batch);
  },
});
```

The resource is reserved before the batch executes. The checkpoint is recorded only after the batch succeeds. `dryRun: true` previews batches without executing the process hook.

## Core model

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

Resources are arbitrary strings chosen by the application, such as `db.writes`, `http.requests`, `emails.sent`, `rows.processed`, `browser.sessions`, `llm.tokens`, or `usd`.

## Product direction

The initial wedge is **safe production backfills and risky background work**. Current work is tracked in [#213](https://github.com/8dazo/captor/issues/213) and the build plan lives in [`docs/product/execution-contracts-v1.md`](docs/product/execution-contracts-v1.md).

Planned layers:

1. execution contracts and receipts;
2. backfill batching, checkpoints, resume, and throttling;
3. local persistence and CLI history;
4. automatic instrumentation for common HTTP/database/job runtimes;
5. optional hosted coordination for teams.

## Existing AI runtime

The existing OpenAI-compatible runtime remains available from the package root for compatibility:

```ts
import { createCaptar } from 'captar';
```

Model-call budgets, tool policies, traces, and provider wrappers continue to work. They are now treated as an adapter/use case of the broader execution-safety product rather than Captor's core identity.

If you already use the AI-first SDK, see [`docs/product/migrate-from-ai-runtime.md`](docs/product/migrate-from-ai-runtime.md) before changing working integrations.

## Repository

```text
captor/
├── apps/
│   ├── platform/       # optional hosted run/control layer
│   └── marketing/      # website and docs
├── packages/ts/
│   ├── core/           # execution contracts + backfill primitives
│   ├── sdk/            # published `captar` package
│   ├── config/
│   ├── types/
│   ├── utils/
│   └── ui/
├── docs/product/       # product build plans
├── docs/sdk/           # existing AI runtime engineering docs
├── db/prisma/
└── .github/workflows/
```

## Local development

Requirements: Node.js 20+, pnpm 10, and PostgreSQL only when working on the hosted platform.

```bash
git clone https://github.com/8dazo/captor.git
cd captor
pnpm install
pnpm lint
pnpm test
pnpm build
```

## Contributing

Read [`CONTRIBUTING.md`](CONTRIBUTING.md) and [`DEVELOPMENT.md`](DEVELOPMENT.md). Runtime behavior changes should include focused tests.

## Security

Follow [`SECURITY.md`](SECURITY.md) for responsible disclosure. Never publish credentials or sensitive production payloads in issues.

## License

Apache License 2.0. See [`LICENSE`](LICENSE).
