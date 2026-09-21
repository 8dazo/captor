import type { ReactNode } from 'react';
import { receiptDuration, resourceCapacity, type Receipt } from '../lib/execution-receipts';
import { RunStatus } from './run-status';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

const format = (value: number) => value.toLocaleString('en-US', { maximumSignificantDigits: 15 });
function Region({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="min-w-0 rounded-xl border border-border bg-card p-4 sm:p-5">
      <h2 className="mb-4 text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}
function Json({ value }: { value: unknown }) {
  return (
    <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-black/30 p-3 font-mono text-xs">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

export function ExecutionReceiptDetail({
  receipt,
  importedAt,
}: {
  receipt: Receipt;
  importedAt: string;
}) {
  const resources = Object.entries(receipt.resources);
  const metrics = Object.entries(receipt.metrics);
  const checkpoints = Object.entries(receipt.checkpoints);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <RunStatus status={receipt.status} />
        <span className="text-sm tabular-nums text-muted-foreground">
          {receiptDuration(receipt)}
        </span>
        <span className="text-xs text-muted-foreground">Imported snapshot · not live</span>
      </div>
      {receipt.violations.length > 0 && (
        <Region title="Violations">
          <ul className="divide-y divide-border">
            {receipt.violations.map((violation, index) => (
              <li key={index} className="space-y-2 py-3 first:pt-0">
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded border border-red-400/30 px-2 py-1 text-red-400">
                    {violation.kind}
                  </span>
                  {(violation.resource || violation.metric) && (
                    <code className="break-all py-1">{violation.resource ?? violation.metric}</code>
                  )}
                </div>
                <p className="break-words text-sm">{violation.message}</p>
                {(violation.limit !== undefined || violation.actual !== undefined) && (
                  <p className="text-xs text-muted-foreground">
                    Recorded limit:{' '}
                    {violation.limit === undefined ? 'Not recorded' : format(violation.limit)} ·
                    Actual:{' '}
                    {violation.actual === undefined ? 'Not recorded' : format(violation.actual)}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </Region>
      )}
      <Region title="Resource usage">
        {resources.length ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Resource</TableHead>
                  <TableHead>Committed</TableHead>
                  <TableHead>Reserved</TableHead>
                  <TableHead>Limit</TableHead>
                  <TableHead>Remaining</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resources.map(([name, usage]) => {
                  const capacity = resourceCapacity(usage);
                  return (
                    <TableRow key={name}>
                      <TableCell className="min-w-48">
                        <code className="break-all text-xs">{name}</code>
                        {capacity.percent !== undefined && (
                          <div
                            role="progressbar"
                            aria-label={`${name} held capacity`}
                            aria-valuenow={capacity.percent}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuetext={`${format(capacity.held)} held of ${format(usage.limit!)}${capacity.exceeded ? ', exceeded' : ''}`}
                            className="mt-2 h-1.5 overflow-hidden rounded bg-white/10"
                          >
                            <div
                              className={
                                capacity.exceeded ? 'h-full bg-red-400' : 'h-full bg-zinc-400'
                              }
                              style={{ width: `${capacity.percent}%` }}
                            />
                          </div>
                        )}
                        {capacity.exceeded && (
                          <p className="mt-1 text-xs text-red-400">Limit exceeded</p>
                        )}
                      </TableCell>
                      <TableCell className="tabular-nums">{format(usage.committed)}</TableCell>
                      <TableCell className="tabular-nums">{format(usage.reserved)}</TableCell>
                      <TableCell>
                        {usage.limit === undefined ? 'No limit' : format(usage.limit)}
                      </TableCell>
                      <TableCell>
                        {capacity.remaining === undefined ? '—' : format(capacity.remaining)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No resource usage recorded.</p>
        )}
        <p className="mt-4 text-xs text-muted-foreground">
          Reserved capacity counts toward each limit. Receipts contain totals, not individual
          reserve, commit or release events.
        </p>
      </Region>
      <div className="grid gap-5 xl:grid-cols-2">
        <Region title="Outcome evidence">
          {metrics.length ? (
            <dl className="space-y-3">
              {metrics.map(([name, value]) => (
                <div key={name} className="flex justify-between gap-4 text-sm">
                  <dt className="break-all font-mono text-xs">{name}</dt>
                  <dd className="tabular-nums">{format(value)}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">No outcome metrics recorded.</p>
          )}
          <p className="mt-4 text-xs text-muted-foreground">
            Outcome failures appear in violations. This receipt does not include assertion
            definitions, so individual checks cannot be marked as passed.
          </p>
        </Region>
        <Region title="Checkpoints">
          {checkpoints.length ? (
            <div className="space-y-3">
              {checkpoints.map(([name, value]) => (
                <details key={name}>
                  <summary className="cursor-pointer break-all py-1 font-mono text-xs">
                    {name}
                  </summary>
                  <Json value={value} />
                </details>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No checkpoint recorded.</p>
          )}
          <p className="mt-4 text-xs text-muted-foreground">
            Resume history is not recorded in this receipt. Resume the job in its original runtime
            using Captor’s local checkpoint store.
          </p>
        </Region>
      </div>
      <Region title="Receipt details">
        <dl className="grid gap-4 text-xs sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Run ID</dt>
            <dd className="mt-1 break-all font-mono">{receipt.id}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Contract definition</dt>
            <dd className="mt-1">Not included in this receipt</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Started</dt>
            <dd className="mt-1 break-all font-mono">{receipt.startedAt}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Ended</dt>
            <dd className="mt-1 break-all font-mono">{receipt.endedAt ?? 'Not recorded'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Imported</dt>
            <dd className="mt-1 break-all font-mono">{importedAt}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Source</dt>
            <dd className="mt-1">User-imported Captor receipt</dd>
          </div>
        </dl>
        {!receipt.violations.length && (
          <p className="mt-4 text-xs text-muted-foreground">
            {receipt.status === 'failed'
              ? 'This run failed, but the receipt does not record a failure reason or violation.'
              : 'No violations recorded in this snapshot.'}
          </p>
        )}
        <details className="mt-5">
          <summary className="cursor-pointer py-2 text-sm">Raw receipt JSON</summary>
          <Json value={receipt} />
        </details>
      </Region>
    </div>
  );
}
