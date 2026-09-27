'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCheck,
  Copy,
  Database,
  FileCheck2,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  Terminal,
  Workflow,
} from 'lucide-react';

type Phase = 'ready' | 'running' | 'blocked' | 'complete';
const features = [
  {
    number: '01',
    icon: ShieldCheck,
    title: 'Stop before the next operation.',
    text: 'Reserve capacity before a write or request. A run that reaches its per-run limit rejects the next guarded operation.',
    href: '/docs/execution/contracts',
    caption: 'Resource limits & deadlines',
  },
  {
    number: '02',
    icon: Workflow,
    title: 'Restart from completed work.',
    text: 'Backfills save an offset after each successful batch. Restart from that checkpoint with stable inputs and idempotent writes.',
    href: '/docs/execution/backfills',
    caption: 'Batch checkpoints & resume',
  },
  {
    number: '03',
    icon: CheckCheck,
    title: 'Know whether it really succeeded.',
    text: 'Assert an outcome metric and inspect a receipt with status, resource usage, checkpoints, and violations.',
    href: '/docs/execution/stores',
    caption: 'Outcome checks & receipts',
  },
];

const examples = [
  {
    label: 'Repair job',
    filename: 'customer-repair.ts',
    description:
      'A complete local example: the fourth guarded write would fail before it starts. Replace the Set with an awaited, idempotent database write.',
    code: `import { run } from 'captar';

const customers = [{ id: 1 }, { id: 2 }, { id: 3 }];
const repaired = new Set<number>();

const { receipt } = await run(
  'customer-repair',
  {
    limits: { resources: { 'db.writes': 3 } },
    outcome: { 'records.processed': { equals: customers.length } },
  },
  async (execution) => {
    for (const customer of customers) {
      const write = execution.reserve('db.writes', 1);
      repaired.add(customer.id); // replace with awaited write
      execution.commit(write);
    }
    execution.metric('records.processed', repaired.size);
  }
);

console.log(receipt.status, receipt.resources['db.writes']);`,
    href: '/docs/getting-started/quickstart',
    link: 'Run the quickstart',
  },
  {
    label: 'Backfill & resume',
    filename: 'backfill.ts',
    description:
      'Reserve each batch before work, then persist its offset. On restart, use the same ordered source and idempotent processing.',
    code: `import { backfill, JsonlRunStore } from 'captar';

const result = await backfill({
  name: 'customers-v2',
  source: [1, 2, 3, 4],
  batchSize: 2,
  store: new JsonlRunStore(),
  resume: true,
  resource: 'db.writes',
  contract: {
    limits: { resources: { 'db.writes': 4 } },
  },
  process: async (ids) => {
    console.log('Replace with an idempotent batch write:', ids);
  },
});

console.log(result.receipt.checkpoints['backfill.cursor']);`,
    href: '/docs/execution/backfills',
    link: 'Understand recovery',
  },
  {
    label: 'API sync',
    filename: 'partner-sync.ts',
    description:
      'Use the bounded fetch adapter inside an existing job. Each attempted request checks capacity before it starts.',
    code: `import { boundedFetch, run } from 'captar';

const urls = [
  'https://example.com/api/one',
  'https://example.com/api/two',
];

const { receipt } = await run(
  'partner-sync',
  { limits: { resources: { 'http.requests': 2 } } },
  async (execution) => {
    const fetch = boundedFetch(execution);
    for (const url of urls) {
      await fetch(url);
    }
  }
);

console.log(receipt.resources['http.requests']);`,
    href: '/docs/execution/adapters',
    link: 'Explore adapters',
  },
] as const;

const useCases = [
  {
    number: '01',
    title: 'Data backfills',
    description:
      'Batch a large update, cap writes per invocation, and resume from the last saved offset.',
    resource: 'db.writes',
  },
  {
    number: '02',
    title: 'Repair scripts',
    description:
      'Keep one-off fixes inside an explicit write limit and check the result before calling them done.',
    resource: 'records.processed',
  },
  {
    number: '03',
    title: 'API syncs',
    description:
      'Bound outgoing fetch attempts when an external API or retry loop behaves unexpectedly.',
    resource: 'http.requests',
  },
  {
    number: '04',
    title: 'Recurring workers',
    description:
      'Put a per-run contract around the work your existing cron or queue worker starts.',
    resource: 'per-run policy',
  },
];

const faqs = [
  {
    question: 'Does Captor replace my job runner?',
    answer:
      'No. Keep your existing cron, queue, workflow engine, or Node process. Captor runs inside the application code that performs the work.',
  },
  {
    question: 'Does it automatically count every write and request?',
    answer:
      'Only operations routed through Captor count. Use reserve/commit in your code, boundedFetch, or the supported Prisma query guard. Work that bypasses those boundaries is not automatically metered.',
  },
  {
    question: 'Can a resumed backfill repeat a write?',
    answer:
      'Yes. A failure between an external side effect and its saved checkpoint can repeat that work. Use stable source ordering, idempotent writes, and transactions where appropriate. Each resumed invocation has a fresh limit.',
  },
  {
    question: 'Do I need an account or hosted platform?',
    answer:
      'No. The SDK and JSONL or SQLite receipt stores work locally. The optional platform supports manual import and inspection of receipt files; it does not remotely run your jobs.',
  },
  {
    question: 'Why is the npm package named captar?',
    answer:
      'Captor is the product name. The published npm package and the import path are currently captar. The package supports Node.js 22 and newer.',
  },
];

export function CaptorLanding() {
  const [motionEnabled, setMotionEnabled] = useState(true);
  const [limit, setLimit] = useState(4);
  const [consumed, setConsumed] = useState(4);
  const [phase, setPhase] = useState<Phase>('blocked');
  const [copyStatus, setCopyStatus] = useState('');
  const [activeExample, setActiveExample] = useState(0);

  useEffect(() => {
    if (phase !== 'running' || !motionEnabled) return;
    const timer = window.setTimeout(() => {
      if (consumed >= limit) setPhase(limit < 6 ? 'blocked' : 'complete');
      else setConsumed((value) => value + 1);
    }, 420);
    return () => window.clearTimeout(timer);
  }, [phase, consumed, limit, motionEnabled]);

  function runDemo() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !motionEnabled) {
      setConsumed(limit);
      setPhase(limit < 6 ? 'blocked' : 'complete');
    } else {
      setConsumed(0);
      setPhase('running');
    }
  }

  async function copyInstall() {
    try {
      await navigator.clipboard.writeText('npm install captar');
      setCopyStatus('Copied to clipboard');
    } catch {
      setCopyStatus('Select the command to copy it');
    }
  }

  const status =
    phase === 'running'
      ? motionEnabled
        ? 'Executing'
        : 'Demo paused'
      : phase === 'blocked'
        ? 'Limit enforced'
        : phase === 'complete'
          ? 'Run completed'
          : 'Ready to run';
  const progress = consumed / limit;
  const selectedExample = examples[activeExample] ?? examples[0];

  return (
    <main id="main-content" className="captor-landing" data-motion={motionEnabled ? 'on' : 'off'}>
      <section className="captor-hero" aria-labelledby="hero-title">
        <div className="captor-hero-grid" aria-hidden="true" />
        <div className="captor-hero-top">
          <span>
            <i /> BACKFILLS & BACKGROUND JOBS
          </span>
          <span className="captor-hero-coordinate">OPEN-SOURCE TYPESCRIPT SDK</span>
        </div>
        <div className="captor-hero-content">
          <div className="captor-hero-copy">
            <h1 id="hero-title">
              Hard limits
              <br />
              for the jobs
              <br />
              you <span>run.</span>
            </h1>
            <p>
              Captor puts execution contracts around backfills and background jobs. Set per-run
              limits, save completed progress, verify the outcome, and inspect what happened.
            </p>
            <div className="captor-actions">
              <Link
                className="captor-button captor-button-primary"
                href="/docs/getting-started/quickstart"
              >
                Try the quickstart <ArrowUpRight size={18} aria-hidden="true" />
              </Link>
              <a className="captor-text-link" href="#examples">
                See the code <ArrowDown size={15} aria-hidden="true" />
              </a>
            </div>
            <div className="captor-install">
              <code>npm install captar</code>
              <button type="button" onClick={copyInstall} aria-label="Copy install command">
                {copyStatus === 'Copied to clipboard' ? <Check size={15} /> : <Copy size={15} />}
              </button>
            </div>
            <span className="captor-copy-status" role="status">
              {copyStatus || 'Product: Captor · npm package: captar · Node.js 22+'}
            </span>
          </div>

          <div
            className="captor-instrument"
            id="interactive-demo"
            aria-label="Interactive resource limit illustration"
          >
            <div className="captor-instrument-header">
              <span>
                <span className="captor-square" /> RUNTIME / 001
              </span>
              <span>API SYNC / INTERACTIVE DEMO</span>
            </div>
            <div className="captor-gauge-stage">
              <div className="captor-orbit captor-orbit-one" aria-hidden="true">
                <i />
              </div>
              <div className="captor-orbit captor-orbit-two" aria-hidden="true">
                <i />
              </div>
              <span className="captor-gauge-note captor-gauge-note-left" aria-hidden="true">
                RESOURCE
                <br />
                http.requests
              </span>
              <span className="captor-gauge-note captor-gauge-note-right" aria-hidden="true">
                PER RUN
                <br />
                {limit} MAX
              </span>
              <svg className="captor-gauge" viewBox="0 0 300 300" aria-hidden="true">
                <circle cx="150" cy="150" r="116" className="captor-gauge-track" />
                {Array.from({ length: 48 }, (_, i) => {
                  const angle = ((i * 7.5 - 90) * Math.PI) / 180;
                  return (
                    <line
                      key={i}
                      x1={150 + 130 * Math.cos(angle)}
                      y1={150 + 130 * Math.sin(angle)}
                      x2={150 + (i % 4 === 0 ? 140 : 135) * Math.cos(angle)}
                      y2={150 + (i % 4 === 0 ? 140 : 135) * Math.sin(angle)}
                      className={i / 48 < progress ? 'captor-tick-lit' : 'captor-tick'}
                    />
                  );
                })}
                <circle
                  cx="150"
                  cy="150"
                  r="116"
                  className="captor-gauge-fill"
                  strokeDasharray={`${progress * 729} 729`}
                  transform="rotate(-90 150 150)"
                />
                <circle cx="150" cy="150" r="96" className="captor-gauge-inner" />
              </svg>
              <div className="captor-gauge-value">
                <span>REQUESTS USED</span>
                <strong>
                  {consumed}
                  <small>/{limit}</small>
                </strong>
                <span
                  className={`captor-status ${phase === 'complete' ? 'captor-status-success' : ''}`}
                >
                  <i />
                  {status}
                </span>
              </div>
            </div>
            <div
              className="captor-request-track"
              aria-label={`${consumed} of six planned requests executed`}
            >
              {Array.from({ length: 6 }, (_, i) => (
                <div
                  key={i}
                  className={`captor-request ${i < consumed ? 'captor-request-done' : phase === 'blocked' && i === consumed ? 'captor-request-blocked' : ''}`}
                >
                  <span>0{i + 1}</span>
                  {i < consumed ? (
                    <Check size={14} aria-hidden="true" />
                  ) : phase === 'blocked' && i === consumed ? (
                    <span aria-hidden="true">×</span>
                  ) : (
                    <span aria-hidden="true">·</span>
                  )}
                </div>
              ))}
            </div>
            <div className="captor-demo-event" role="status" aria-live="polite">
              <span aria-hidden="true">↳</span>{' '}
              {phase === 'blocked'
                ? `Request ${consumed + 1} blocked before execution.`
                : phase === 'complete'
                  ? 'All 6 requests completed within the limit.'
                  : phase === 'running'
                    ? motionEnabled
                      ? 'Checking capacity before each request…'
                      : 'Demo paused. Resume motion to continue.'
                    : 'Six requests planned. You set the limit.'}
            </div>
            <div className="captor-demo-controls">
              <label htmlFor="request-limit">
                Request limit <strong>{limit}</strong>
              </label>
              <input
                id="request-limit"
                type="range"
                min="2"
                max="6"
                step="1"
                value={limit}
                disabled={phase === 'running'}
                onChange={(event) => {
                  setLimit(Number(event.target.value));
                  setConsumed(0);
                  setPhase('ready');
                }}
              />
              <button
                className="captor-run-button"
                type="button"
                onClick={runDemo}
                disabled={phase === 'running'}
              >
                {phase === 'running' ? 'Running' : 'Run demo'}{' '}
                {phase === 'blocked' || phase === 'complete' ? (
                  <RotateCcw size={13} aria-hidden="true" />
                ) : (
                  <Play size={13} aria-hidden="true" />
                )}
              </button>
            </div>
            <div className="captor-instrument-footer">
              <span>Local illustration · no requests sent</span>
              <button
                type="button"
                onClick={() => setMotionEnabled(!motionEnabled)}
                aria-pressed={!motionEnabled}
                aria-label={motionEnabled ? 'Pause motion' : 'Resume motion'}
              >
                {motionEnabled ? <Pause size={12} /> : <Play size={12} />}
                <span>{motionEnabled ? 'Pause motion' : 'Resume motion'}</span>
              </button>
            </div>
          </div>
        </div>
        <div className="captor-hero-bottom">
          <span>RUNS INSIDE YOUR EXISTING STACK</span>
          <div>
            <span>cron</span>
            <span>queues</span>
            <span>scripts</span>
            <span>workflows</span>
          </div>
          <a href="#how-it-works" aria-label="Explore how Captor works">
            <ArrowDown size={18} />
          </a>
        </div>
      </section>

      <section id="how-it-works" className="captor-benefits" aria-labelledby="benefits-title">
        <div className="captor-section-label">
          <span>WHY AN EXECUTION CONTRACT?</span>
          <span>01 — 03</span>
        </div>
        <div className="captor-section-heading">
          <h2 id="benefits-title">
            A successful exit
            <br />
            <span>isn’t the whole story.</span>
          </h2>
          <p>
            A job can return normally after doing too much,
            <br />
            or fail with no trustworthy place to restart.
          </p>
        </div>
        <div className="captor-feature-grid">
          {features.map(({ number, icon: Icon, title, text, href, caption }) => (
            <Link href={href} className="captor-feature" key={number}>
              <div className="captor-feature-top">
                <span>{number}</span>
                <Icon size={23} strokeWidth={1.4} aria-hidden="true" />
              </div>
              <h3>{title}</h3>
              <p>{text}</p>
              <div className="captor-feature-bottom">
                <span>{caption}</span>
                <ArrowUpRight size={17} aria-hidden="true" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section id="examples" className="captor-start" aria-labelledby="start-title">
        <div className="captor-start-copy">
          <span className="captor-eyebrow">CODE THAT SETS THE RULES</span>
          <h2 id="start-title">
            An ordinary job.
            <br />
            With a contract.
          </h2>
          <p>
            Add Captor where the side effects happen. Reserve capacity before work, commit it after
            success, and report a metric for the outcome check. These examples use the published{' '}
            <code>captar</code> package.
          </p>
          <Link
            href="/docs/getting-started/quickstart"
            className="captor-button captor-button-primary"
          >
            Run the quickstart <ArrowRight size={17} aria-hidden="true" />
          </Link>
          <Link className="captor-recovery-link" href="/docs/getting-started/recovery-demo">
            See the fresh-process recovery demo <ArrowUpRight size={13} aria-hidden="true" />
          </Link>
        </div>
        <div className="captor-code-panel">
          <div className="captor-example-tabs" role="group" aria-label="Code examples">
            {examples.map((example, index) => (
              <button
                key={example.label}
                type="button"
                aria-pressed={activeExample === index}
                onClick={() => setActiveExample(index)}
              >
                {example.label}
              </button>
            ))}
          </div>
          <div className="captor-code-title">
            <span>
              <Terminal size={15} aria-hidden="true" /> {selectedExample.filename}
            </span>
            <span>TypeScript</span>
          </div>
          <pre>
            <code>{selectedExample.code}</code>
          </pre>
          <div className="captor-code-foot">
            <span>
              <i /> {selectedExample.description}
            </span>
            <Link href={selectedExample.href}>
              {selectedExample.link} <ArrowUpRight size={12} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <section id="use-cases" className="captor-use-cases" aria-labelledby="use-cases-title">
        <div className="captor-section-label">
          <span>WHERE CAPTOR FITS</span>
          <span>YOUR RUNNER STAYS</span>
        </div>
        <div className="captor-section-heading">
          <h2 id="use-cases-title">
            For work that can’t
            <br />
            <span>run without a boundary.</span>
          </h2>
          <p>Run it from cron, BullMQ, Temporal, a CI job, or a plain Node process.</p>
        </div>
        <div className="captor-use-grid">
          {useCases.map((item) => (
            <article className="captor-use-card" key={item.title}>
              <span className="captor-use-number">{item.number} / USE CASE</span>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              <code>{item.resource}</code>
            </article>
          ))}
        </div>
      </section>

      <section className="captor-operating" aria-labelledby="operating-title">
        <div className="captor-operating-copy">
          <span className="captor-eyebrow">LOCAL BY DEFAULT</span>
          <h2 id="operating-title">
            Your runner starts it.
            <br />
            Captor bounds it.
          </h2>
          <p>
            Captor lives inside your Node application. It checks operations you route through the
            SDK, then produces an execution receipt. Use <code>runStored</code> or a stored backfill
            to keep receipts and checkpoints in local JSONL or SQLite.
          </p>
          <div className="captor-flow" aria-label="Execution flow">
            <div>
              <span>01</span>
              <strong>Your runner</strong>
              <small>Starts the job</small>
            </div>
            <ArrowRight size={17} aria-hidden="true" />
            <div>
              <span>02</span>
              <strong>Captor SDK</strong>
              <small>Checks the contract</small>
            </div>
            <ArrowRight size={17} aria-hidden="true" />
            <div>
              <span>03</span>
              <strong>Your work</strong>
              <small>Returns a receipt</small>
            </div>
          </div>
          <div className="captor-operating-links">
            <Link href="/docs/execution/stores">
              Local stores & CLI <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
            <Link href="/docs/platform/receipts">
              Optional manual receipt import <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
          </div>
          <p className="captor-operating-note">
            The platform can inspect a receipt file you choose to import; it does not execute jobs
            or automatically collect execution receipts.
          </p>
        </div>
        <div className="captor-receipt" aria-label="Example execution receipt">
          <div className="captor-receipt-header">
            <FileCheck2 size={16} aria-hidden="true" /> EXECUTION RECEIPT <span>EXAMPLE</span>
          </div>
          <div className="captor-receipt-name">
            customer-repair{' '}
            <span className="captor-receipt-status">
              <i /> succeeded
            </span>
          </div>
          <div className="captor-receipt-row">
            <span>db.writes</span>
            <strong>3 / 3</strong>
            <small>committed / limit</small>
          </div>
          <div className="captor-receipt-row">
            <span>records.processed</span>
            <strong>3</strong>
            <small>outcome metric</small>
          </div>
          <div className="captor-receipt-row">
            <span>violations</span>
            <strong>0</strong>
            <small>contract checks</small>
          </div>
          <div className="captor-receipt-foot">
            <Database size={15} aria-hidden="true" /> Save locally when a store is supplied.
          </div>
        </div>
      </section>

      <section className="captor-boundaries" aria-labelledby="boundaries-title">
        <div>
          <span className="captor-eyebrow">THE IMPORTANT DETAILS</span>
          <h2 id="boundaries-title">Know the boundary.</h2>
          <p>
            Limits are enforced where your code calls Captor or uses its supported adapters.
            Deadlines send an AbortSignal; the underlying work must honor cancellation. Captor
            cannot undo an already completed side effect.
          </p>
          <Link href="/docs/execution/contracts">
            Read the execution model <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        </div>
        <div className="captor-faq">
          <h3>Common questions</h3>
          {faqs.map((faq) => (
            <details key={faq.question}>
              <summary>
                {faq.question}
                <span aria-hidden="true">+</span>
              </summary>
              <p>{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="captor-final" aria-labelledby="final-title">
        <span className="captor-eyebrow">START WITH ONE REAL JOB</span>
        <h2 id="final-title">Put a limit on your next backfill.</h2>
        <p>
          Install the open-source SDK, run a local example, then test it against a small,
          representative workload.
        </p>
        <div className="captor-final-actions">
          <Link
            className="captor-button captor-button-primary"
            href="/docs/getting-started/quickstart"
          >
            Start with the quickstart <ArrowUpRight size={17} aria-hidden="true" />
          </Link>
          <Link href="https://github.com/8dazo/captor">
            View source on GitHub <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </section>
    </main>
  );
}
