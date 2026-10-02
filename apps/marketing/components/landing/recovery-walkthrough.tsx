'use client';

import { useState } from 'react';
import { ArrowRight, Check, RotateCcw } from 'lucide-react';

const stages = [
  {
    label: '01 / Start',
    title: 'Six records. Four writes per run.',
    detail:
      'A stable source is split into batches of two. The run reserves each batch before the write.',
    completed: 0,
    cursor: 0,
    used: 0,
    status: 'running',
    run: 'RUN 01',
  },
  {
    label: '02 / Stop',
    title: 'Four saved. The next batch is blocked.',
    detail:
      'Two batches finish and their offset is persisted. The third reservation exceeds the limit before any more writes start.',
    completed: 4,
    cursor: 4,
    used: 4,
    status: 'failed · resource limit',
    run: 'RUN 01',
  },
  {
    label: '03 / Resume',
    title: 'A new run. Just the remaining two.',
    detail:
      'An explicit restart reads the saved offset. This new invocation has a fresh allowance of four; it uses two and finishes.',
    completed: 6,
    cursor: 6,
    used: 2,
    status: 'succeeded',
    run: 'RUN 02',
  },
] as const;

export function RecoveryWalkthrough() {
  const [step, setStep] = useState(1);
  const stage = stages[step]!;
  return (
    <div className="captor-recovery-card" aria-label="Illustrated backfill recovery">
      <div className="captor-receipt-header">
        <RotateCcw size={15} aria-hidden="true" /> CHECKPOINT / RESTART <span>ILLUSTRATION</span>
      </div>
      <div className="captor-recovery-tabs" role="group" aria-label="Recovery stages">
        {stages.map((item, index) => (
          <button
            key={item.label}
            type="button"
            aria-pressed={index === step}
            onClick={() => setStep(index)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="captor-recovery-stage" aria-live="polite">
        <span className="captor-eyebrow">{stage.run}</span>
        <h3>{stage.title}</h3>
        <p>{stage.detail}</p>
        <div
          className="captor-recovery-records"
          aria-label={`${stage.completed} of six records completed`}
        >
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} data-done={index < stage.completed}>
              <span>0{index + 1}</span>
              {index < stage.completed ? <Check size={17} aria-hidden="true" /> : <span>·</span>}
            </div>
          ))}
        </div>
        <dl>
          <div>
            <dt>Saved offset</dt>
            <dd>{stage.cursor}</dd>
          </div>
          <div>
            <dt>This run’s writes</dt>
            <dd>{stage.used} / 4</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{stage.status}</dd>
          </div>
        </dl>
      </div>
      <div className="captor-recovery-bottom">
        <span>Replay can repeat a write. Make side effects idempotent.</span>
        <button
          type="button"
          onClick={() => setStep((step + 1) % stages.length)}
          aria-label={step === 2 ? 'Restart recovery illustration' : 'Next recovery stage'}
        >
          {step === 2 ? <RotateCcw size={17} /> : <ArrowRight size={17} />}
        </button>
      </div>
    </div>
  );
}
