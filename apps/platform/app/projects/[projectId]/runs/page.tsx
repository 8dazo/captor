import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AppShell } from '../../../../components/app-shell';
import { ReceiptImport } from '../../../../components/receipt-import';
import { RunStatus } from '../../../../components/run-status';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../../components/ui/table';
import { requireUser } from '../../../../lib/auth-guard';
import { getProjectById } from '../../../../lib/platform';
import { listExecutionRuns } from '../../../../lib/execution-runs';
import { receiptDuration, receiptStatuses } from '../../../../lib/execution-receipts';

export const dynamic = 'force-dynamic';
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function RunsPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const { projectId } = await params;
  const project = await getProjectById(projectId, user.id);
  if (!project) notFound();
  const query = await searchParams;
  const result = await listExecutionRuns(projectId, user.id, {
    q: first(query.q),
    status: first(query.status),
    page: first(query.page),
  });
  const pageHref = (page: number) => {
    const values = new URLSearchParams({ page: String(page) });
    if (result.q) values.set('q', result.q);
    if (result.status) values.set('status', result.status);
    return `/projects/${projectId}/runs?${values}`;
  };
  return (
    <AppShell userName={user.email} projectId={projectId} projectName={project.name}>
      <div className="space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link
              href={`/projects/${projectId}`}
              className="text-sm text-muted-foreground hover:underline"
            >
              {project.name}
            </Link>
            <h1 className="mt-1 text-2xl font-semibold">Runs</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Inspect what production work consumed, where it stopped and what it achieved.
            </p>
          </div>
          <ReceiptImport projectId={projectId} />
        </header>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <p>Imported receipt snapshots · {result.total.toLocaleString('en-US')} matching runs</p>
          <Link href={`/projects/${projectId}/traces`} className="underline underline-offset-4">
            Open legacy AI traces
          </Link>
        </div>
        <form className="flex flex-wrap gap-3" aria-label="Filter runs">
          <Input
            name="q"
            aria-label="Search runs"
            placeholder="Search run name or ID"
            defaultValue={result.q}
            className="min-w-48 flex-1"
          />
          <select
            name="status"
            aria-label="Run status"
            defaultValue={result.status ?? ''}
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm focus-visible:outline focus-visible:outline-2"
          >
            <option value="">All statuses</option>
            {receiptStatuses.map((status) => (
              <option key={status} value={status}>
                {status === 'running' ? 'Running at capture' : status}
              </option>
            ))}
          </select>
          <Button type="submit" variant="outline">
            Apply
          </Button>
          {(result.q || result.status) && (
            <Button variant="ghost" asChild>
              <Link href={`/projects/${projectId}/runs`}>Clear</Link>
            </Button>
          )}
        </form>
        {result.rows.length ? (
          <div className="overflow-x-auto rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Execution</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Resources</TableHead>
                  <TableHead>Violations</TableHead>
                  <TableHead>Started (UTC)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Link
                        className="font-medium underline-offset-4 hover:underline focus-visible:underline"
                        href={`/projects/${projectId}/runs/${row.id}`}
                      >
                        {row.name}
                      </Link>
                      <p
                        className="mt-1 max-w-64 truncate font-mono text-xs text-muted-foreground"
                        title={row.runId}
                      >
                        {row.runId}
                      </p>
                    </TableCell>
                    <TableCell>
                      <RunStatus status={row.data.status} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap tabular-nums">
                      {receiptDuration(row.data)}
                    </TableCell>
                    <TableCell>{Object.keys(row.data.resources).length}</TableCell>
                    <TableCell>{row.data.violations.length}</TableCell>
                    <TableCell className="whitespace-nowrap font-mono text-xs">
                      {row.startedAt.toISOString().replace('T', ' ').slice(0, 19)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <section className="rounded-xl border border-dashed border-border p-8 text-center">
            <h2 className="font-medium">
              {result.q || result.status || result.page > 1
                ? 'No runs on this page'
                : 'Inspect your first protected execution'}
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
              {result.q || result.status || result.page > 1
                ? 'Clear filters or return to the first page.'
                : 'Run your backfill with Captor, then import its receipt JSON or .captor/runs.jsonl history file. Your work continues to run locally.'}
            </p>
            {(result.q || result.status || result.page > 1) && (
              <Link
                className="mt-4 inline-block text-sm underline"
                href={`/projects/${projectId}/runs`}
              >
                View all runs
              </Link>
            )}
          </section>
        )}
        <nav aria-label="Run pagination" className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Page {result.page} · 25 per page</span>
          <div className="flex gap-2">
            {result.page > 1 && (
              <Button variant="outline" asChild>
                <Link href={pageHref(result.page - 1)}>Previous</Link>
              </Button>
            )}
            {result.page * 25 < result.total && (
              <Button variant="outline" asChild>
                <Link href={pageHref(result.page + 1)}>Next</Link>
              </Button>
            )}
          </div>
        </nav>
      </div>
    </AppShell>
  );
}
