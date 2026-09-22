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
    title: 'Set the ceiling.',
    text: 'Put an explicit limit on the requests, writes, or resources your job consumes.',
    href: '/docs/execution/contracts',
    caption: 'Your rules. Enforced in code.',
  },
  {
    number: '02',
    icon: Workflow,
    title: 'Keep your progress.',
    text: 'Save completed batch checkpoints. Resume with stable inputs and idempotent writes.',
    href: '/docs/execution/backfills',
    caption: 'A clear place to pick back up.',
  },
  {
    number: '03',
    icon: CheckCheck,
    title: 'Know what happened.',
    text: 'Check the outcome and inspect a local receipt of usage, progress, and violations.',
    href: '/docs/execution/stores',
    caption: 'Evidence for every stored run.',
  },
];

export function CaptorLanding() {
  const [motionEnabled, setMotionEnabled] = useState(true);
  const [limit, setLimit] = useState(4);
  const [consumed, setConsumed] = useState(4);
  const [phase, setPhase] = useState<Phase>('blocked');
  const [copyStatus, setCopyStatus] = useState('');

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
  const progress = consumed / 6;

  return (
    <main id="main-content" className="captor-landing" data-motion={motionEnabled ? 'on' : 'off'}>
      <section className="captor-hero" aria-labelledby="hero-title">
        <div className="captor-hero-grid" aria-hidden="true" />
        <div className="captor-hero-top">
          <span>
            <i /> THE OPEN-SOURCE EXECUTION SDK
          </span>
          <span className="captor-hero-coordinate">CONTROL / BEFORE EXECUTION</span>
        </div>
        <div className="captor-hero-content">
          <div className="captor-hero-copy">
            <h1 id="hero-title">
              Let it run.
              <br />
              Know when
              <br />
              to <span>stop.</span>
            </h1>
            <p>
              Hard limits for the work you ship.
              <br />
              Bound your jobs. Save progress. Verify the outcome.
            </p>
            <div className="captor-actions">
              <Link
                className="captor-button captor-button-primary"
                href="/docs/getting-started/quickstart"
              >
                Start building <ArrowUpRight size={18} aria-hidden="true" />
              </Link>
              <a className="captor-text-link" href="#how-it-works">
                See how it works <ArrowDown size={15} aria-hidden="true" />
              </a>
            </div>
            <div className="captor-install">
              <code>npm install captar</code>
              <button type="button" onClick={copyInstall} aria-label="Copy install command">
                {copyStatus === 'Copied to clipboard' ? <Check size={15} /> : <Copy size={15} />}
              </button>
            </div>
            <span className="captor-copy-status" role="status">
              {copyStatus || 'TypeScript · Local first · Apache-2.0'}
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
              <span>INTERACTIVE DEMO</span>
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
          <span>YOUR CODE. YOUR INFRASTRUCTURE.</span>
          <div>
            <span>Node.js</span>
            <span>TypeScript</span>
            <span>fetch</span>
            <span>Prisma</span>
          </div>
          <a href="#how-it-works" aria-label="Explore how Captor works">
            <ArrowDown size={18} />
          </a>
        </div>
      </section>

      <section id="how-it-works" className="captor-benefits" aria-labelledby="benefits-title">
        <div className="captor-section-label">
          <span>THE BOUNDARY LAYER</span>
          <span>01 — 03</span>
        </div>
        <div className="captor-section-heading">
          <h2 id="benefits-title">
            More control.
            <br />
            <span>Less second-guessing.</span>
          </h2>
          <p>
            A small layer inside your application.
            <br />A clear boundary around what it can do.
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

      <section className="captor-start" aria-labelledby="start-title">
        <div className="captor-start-copy">
          <span className="captor-eyebrow">SMALL SDK. CLEAR BOUNDARIES.</span>
          <h2 id="start-title">
            Your next job.
            <br />
            With a safety limit.
          </h2>
          <p>Keep your runner. Add Captor where the work happens.</p>
          <Link
            href="/docs/getting-started/quickstart"
            className="captor-button captor-button-primary"
          >
            Try the quickstart <ArrowRight size={17} aria-hidden="true" />
          </Link>
          <Link className="captor-recovery-link" href="/docs/getting-started/recovery-demo">
            Or explore the recovery demo <ArrowUpRight size={13} aria-hidden="true" />
          </Link>
        </div>
        <div className="captor-code-panel">
          <div className="captor-code-title">
            <span>
              <Terminal size={15} aria-hidden="true" /> bounded-request.ts
            </span>
            <span>TypeScript</span>
          </div>
          <pre>
            <code>
              <span className="captor-code-comment">
                {'// Your fetch. With a request ceiling.'}
              </span>
              {'\n'}
              <span className="captor-code-purple">import</span>
              {' { run, boundedFetch } '}
              <span className="captor-code-purple">from</span>{' '}
              <span className="captor-code-yellow">{"'captar'"}</span>
              {';\n\n'}
              <span className="captor-code-purple">await</span>
              {' run('}
              <span className="captor-code-yellow">{"'sync'"}</span>
              {', {\n  limits: { resources: {\n    '}
              <span className="captor-code-yellow">{"'http.requests'"}</span>
              {': '}
              <span className="captor-code-yellow">4</span>
              {'\n  } },\n}, '}
              <span className="captor-code-purple">async</span>
              {' (execution) => {\n  '}
              <span className="captor-code-purple">const</span>
              {' fetch = boundedFetch(execution);\n  '}
              <span className="captor-code-comment">{'// Use this fetch for your requests.'}</span>
              {'\n});'}
            </code>
          </pre>
          <div className="captor-code-foot">
            <span>
              <i /> Runs inside your app
            </span>
            <span>No hosted account required</span>
          </div>
        </div>
      </section>
    </main>
  );
}
