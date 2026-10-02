'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Check, Copy, Download, SlidersHorizontal } from 'lucide-react';
import { contractPresets, makeContractPlan } from './contract-model';

export function ContractBuilder() {
  const [preset, setPreset] = useState(0);
  const [limit, setLimit] = useState(4);
  const [operations, setOperations] = useState(6);
  const [units, setUnits] = useState(1);
  const [feedback, setFeedback] = useState('');
  const plan = makeContractPlan(preset, limit, operations, units);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(plan.code);
      setFeedback('Example copied');
    } catch {
      setFeedback('Copy unavailable. Select the code below to copy it.');
    }
  }

  function downloadContract() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(plan.contract, null, 2) + '\n'], { type: 'application/json' })
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = `captor-${plan.preset.id}-contract.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setFeedback('Contract JSON downloaded');
  }

  return (
    <section className="captor-builder" id="build-contract" aria-labelledby="builder-title">
      <div className="captor-section-label">
        <span>MAKE IT YOURS</span>
        <span>NO KEY. NO ACCOUNT. NO REQUESTS SENT.</span>
      </div>
      <div className="captor-section-heading">
        <h2 id="builder-title">
          A boundary you can
          <br />
          <span>put into code.</span>
        </h2>
        <p>Choose a workload. Set its allowance. Take the contract with you.</p>
      </div>
      <div className="captor-builder-grid">
        <div className="captor-builder-controls">
          <div className="captor-preset-buttons" role="group" aria-label="Contract workload">
            {contractPresets.map((item, index) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={preset === index}
                onClick={() => {
                  setPreset(index);
                  setFeedback('');
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="captor-builder-fields">
            {[
              {
                id: 'contract-limit',
                label: 'Resource allowance',
                value: limit,
                max: 20,
                set: setLimit,
              },
              {
                id: 'contract-operations',
                label: 'Planned operations',
                value: operations,
                max: 20,
                set: setOperations,
              },
              {
                id: 'contract-units',
                label: 'Units per operation',
                value: units,
                max: 5,
                set: setUnits,
              },
            ].map((field) => (
              <div className="captor-builder-field" key={field.id}>
                <label htmlFor={field.id}>
                  {field.label}
                  <output htmlFor={field.id}>{field.value}</output>
                </label>
                <input
                  id={field.id}
                  type="range"
                  min="1"
                  max={field.max}
                  value={field.value}
                  onChange={(event) => {
                    field.set(Number(event.target.value));
                    setFeedback('');
                  }}
                />
              </div>
            ))}
          </div>
          <div className="captor-plan-result" role="status" aria-live="polite">
            <span className="captor-eyebrow">CAPACITY PREVIEW</span>
            <strong>
              {plan.admitted}
              <span> / {operations}</span>
            </strong>
            <p>
              {plan.blocked
                ? `Operation ${plan.admitted + 1} would be blocked.`
                : 'Every planned operation fits.'}
            </p>
            <small>
              {plan.used} / {limit} {plan.preset.noun} used · {plan.remaining} units left
            </small>
          </div>
          <p className="captor-builder-note">
            Illustrative arithmetic with fixed per-operation usage, not a live SDK run or a cost
            estimate. Only operations you route through Captor are metered.
          </p>
        </div>
        <div className="captor-builder-output">
          <div className="captor-code-title">
            <span>
              <SlidersHorizontal size={15} aria-hidden="true" /> {plan.preset.name}.ts
            </span>
            <span>GENERATED EXAMPLE</span>
          </div>
          <pre tabIndex={0} aria-label="Generated contract example">
            <code>{plan.code}</code>
          </pre>
          <div className="captor-builder-actions">
            <button type="button" onClick={copyCode}>
              <Copy size={14} aria-hidden="true" /> Copy example
            </button>
            <button type="button" onClick={downloadContract}>
              <Download size={14} aria-hidden="true" /> Download JSON
            </button>
            <Link href="/docs/execution/contracts">
              API guide <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
          </div>
          <span className="captor-builder-feedback" role="status">
            {feedback || 'Uses the existing run / reserve / commit API.'}
          </span>
        </div>
      </div>
      <div className="captor-builder-release">
        <Check size={16} aria-hidden="true" />
        <p>
          <strong>New in the repository: graceful preflight.</strong>{' '}
          <code>execution.checkResource()</code> checks capacity without consuming it or failing the
          run. A later reservation still enforces the limit.{' '}
          <Link href="/docs/execution/contracts#check-capacity-without-failing-the-run">
            See the unreleased API →
          </Link>
        </p>
      </div>
    </section>
  );
}
