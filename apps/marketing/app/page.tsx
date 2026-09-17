import * as React from 'react';

const install = 'npm install captar';

const example = `import { run } from 'captar/execution';

await run('customer-backfill', {
  limits: {
    durationMs: 20 * 60_000,
    resources: {
      'db.writes': 25_000,
      'stripe.requests': 500,
    },
  },
  outcome: {
    'records.processed': { min: 20_000 },
  },
}, async (execution) => {
  const write = execution.reserve('db.writes', 1);
  await updateCustomer();
  execution.commit(write);
  execution.count('records.processed');
});`;

const primitives = [
  {
    title: 'Hard limits',
    body: 'Bound writes, requests, retries, money, rows, or any resource your application cares about.',
  },
  {
    title: 'Reserve before side effects',
    body: 'Reserve capacity before risky work, commit actual usage after success, and release what you did not use.',
  },
  {
    title: 'Checkpoints',
    body: 'Record safe progress only after committed work so long-running backfills have a clear resume boundary.',
  },
  {
    title: 'Outcome checks',
    body: 'A process exiting zero is not enough. Require the metrics that define whether the job actually succeeded.',
  },
];

export default function IndexPage(): React.JSX.Element {
  return (
    <main className="overflow-hidden">
      <section className="mx-auto flex max-w-6xl flex-col items-center px-6 pb-24 pt-24 text-center sm:pt-32">
        <div className="mb-6 rounded-full border px-4 py-1.5 text-sm text-muted-foreground">
          Open source · local-first · no proxy
        </div>
        <h1 className="max-w-5xl text-balance text-5xl font-semibold tracking-tight sm:text-7xl">
          Put boundaries around production work.
        </h1>
        <p className="mt-7 max-w-3xl text-balance text-lg leading-8 text-muted-foreground sm:text-xl">
          Captor makes backfills, migrations, reconciliation jobs, cron tasks, and background
          work safe to run with hard limits, checkpoints, and outcome checks.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <a
            href="/docs"
            className="rounded-lg bg-foreground px-5 py-3 text-sm font-medium text-background"
          >
            Read the docs
          </a>
          <a
            href="https://github.com/8dazo/captor"
            className="rounded-lg border px-5 py-3 text-sm font-medium"
          >
            View on GitHub
          </a>
        </div>
        <pre className="mt-8 overflow-x-auto rounded-lg border bg-muted/30 px-5 py-3 text-left text-sm">
          <code>{install}</code>
        </pre>
      </section>

      <section className="border-y bg-muted/20">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-20 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div>
            <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
              The missing boundary
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              Your runner makes work execute. Captor decides how far it may go.
            </h2>
            <p className="mt-5 leading-7 text-muted-foreground">
              Keep cron, BullMQ, Temporal, Trigger.dev, GitHub Actions, or plain Node. Captor
              wraps the work you already run instead of becoming another scheduler or workflow engine.
            </p>
          </div>
          <pre className="overflow-x-auto rounded-xl border bg-background p-5 text-sm leading-6 shadow-sm">
            <code>{example}</code>
          </pre>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            Execution contracts
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            Define safety before the job starts.
          </h2>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-2">
          {primitives.map((item) => (
            <div key={item.title} className="rounded-xl border p-6">
              <h3 className="text-lg font-semibold">{item.title}</h3>
              <p className="mt-3 leading-7 text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y bg-muted/20">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-20 lg:grid-cols-2">
          <div>
            <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
              One contract, arbitrary resources
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight">
              The runtime does not need to understand your business to protect it.
            </h2>
            <p className="mt-5 leading-7 text-muted-foreground">
              Resources are names chosen by your application: database writes, API calls, emails,
              rows, browser sessions, dollars, or model tokens. Captor enforces the accounting semantics.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            {[
              'db.writes',
              'http.requests',
              'emails.sent',
              'rows.processed',
              'browser.sessions',
              'usd',
              'stripe.requests',
              'files.created',
              'llm.tokens',
            ].map((resource) => (
              <div key={resource} className="rounded-lg border bg-background px-4 py-4 font-mono">
                {resource}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
              Local first
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight">
              Useful even if Captor Cloud does not exist.
            </h2>
            <p className="mt-5 leading-7 text-muted-foreground">
              The execution runtime runs inside your application. No hosted account or proxy is required.
              The hosted product is an optional coordination layer for shared run history, organization
              policies, alerts, approvals, and fleet-wide controls.
            </p>
          </div>
          <div className="rounded-xl border p-6">
            <p className="font-medium">Works where your jobs already run</p>
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm text-muted-foreground">
              <span>Plain Node</span>
              <span>Cron</span>
              <span>BullMQ</span>
              <span>Temporal</span>
              <span>Trigger.dev</span>
              <span>GitHub Actions</span>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t">
        <div className="mx-auto max-w-4xl px-6 py-24 text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Run the dangerous script with a contract, not a prayer.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl leading-7 text-muted-foreground">
            Start with a backfill. Set a hard ceiling. Record a checkpoint. Verify the outcome.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a
              href="/docs"
              className="rounded-lg bg-foreground px-5 py-3 text-sm font-medium text-background"
            >
              Get started
            </a>
            <a
              href="https://www.npmjs.com/package/captar"
              className="rounded-lg border px-5 py-3 text-sm font-medium"
            >
              npm package
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
