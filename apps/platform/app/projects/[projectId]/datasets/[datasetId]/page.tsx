import Link from 'next/link';
import { notFound } from 'next/navigation';

import { AppShell } from '../../../../../components/app-shell';
import { DatasetImportForm } from '../../../../../components/dataset-import-form';
import { ManualEvalCreateForm } from '../../../../../components/manual-eval-create-form';
import { MetricCard } from '../../../../../components/metric-card';
import { PayloadCard } from '../../../../../components/payload-card';
import { Badge } from '../../../../../components/ui/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../../../../../components/ui/breadcrumb';
import { Button } from '../../../../../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../../../components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../../../components/ui/table';
import { requireUser } from '../../../../../lib/auth-guard';
import {
  getProjectById,
  getProjectDatasetById,
  listDatasetManualEvals,
} from '../../../../../lib/platform';
import { formatTimestamp } from '../../../../../lib/utils';

export const dynamic = 'force-dynamic';

export default async function DatasetDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; datasetId: string }>;
}) {
  const user = await requireUser();
  const { projectId, datasetId } = await params;
  const [project, dataset] = await Promise.all([
    getProjectById(projectId, user.id),
    getProjectDatasetById(projectId, datasetId, user.id),
  ]);

  if (!project || !dataset) {
    notFound();
  }

  const manualEvals = await listDatasetManualEvals(projectId, datasetId, user.id);

  return (
    <AppShell userName={user.email}>
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/projects">Projects</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={`/projects/${project.id}`}>{project.name}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={`/projects/${project.id}/datasets`}>Datasets</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{dataset.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="grid gap-6">
        <Card>
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CardTitle>{dataset.name}</CardTitle>
                <Badge>{dataset.rowCount} rows</Badge>
              </div>
              <CardDescription>
                Dataset in project{' '}
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/projects/${project.id}`}>{project.name}</Link>
                </Button>
              </CardDescription>
              <p className="text-sm text-muted-foreground">
                {dataset.description ?? 'No description yet.'}
              </p>
              <p className="text-sm text-muted-foreground">
                {manualEvals.length} manual eval(s) currently use this dataset.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" asChild>
                <Link href={`/projects/${project.id}/evals`}>Open evals</Link>
              </Button>
              <Button variant="outline" asChild>
                <a href={`/api/projects/${project.id}/datasets/${dataset.id}/export?format=json`}>
                  Export JSON
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href={`/api/projects/${project.id}/datasets/${dataset.id}/export?format=jsonl`}>
                  Export JSONL
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href={`/api/projects/${project.id}/datasets/${dataset.id}/export?format=csv`}>
                  Export CSV
                </a>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <MetricCard label="Rows" value={String(dataset.rowCount)} />
            <MetricCard label="Created" value={formatTimestamp(dataset.createdAt)} />
            <MetricCard label="Updated" value={formatTimestamp(dataset.updatedAt)} />
          </CardContent>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
          <div className="grid gap-6">
            <ManualEvalCreateForm projectId={project.id} datasetId={dataset.id} />
            <DatasetImportForm projectId={project.id} datasetId={dataset.id} />
          </div>

          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Manual evals on this dataset</CardTitle>
                <CardDescription>
                  Create one rubric per review workflow, then launch runs that snapshot these rows.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {manualEvals.length ? (
                  manualEvals.map((manualEval) => (
                    <div
                      key={manualEval.id}
                      className="rounded-xl border border-border bg-card p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <Button variant="outline" asChild>
                            <Link href={`/projects/${project.id}/evals/${manualEval.id}`}>
                              {manualEval.name}
                            </Link>
                          </Button>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {manualEval.description ?? 'No description yet.'}
                          </p>
                        </div>
                        <Badge>{manualEval.runCount} runs</Badge>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span>
                          Reviewed {manualEval.metrics.reviewedRows}/{manualEval.metrics.totalRows}
                        </span>
                        <span>Pass rate {(manualEval.metrics.passRate * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
                    No manual evals yet. Create one from the form to the left.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Dataset rows</CardTitle>
                <CardDescription>
                  Rows stay append-only in v1 so trace exports, imports, and manual eval runs remain
                  auditable.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {dataset.rows.length ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Input</TableHead>
                        <TableHead>Output</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Retention</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dataset.rows.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="font-mono text-xs">{row.position}</TableCell>
                          <TableCell>
                            <PayloadCard label="Input" data={row.input} />
                          </TableCell>
                          <TableCell>
                            <PayloadCard label="Output" data={row.output ?? null} />
                          </TableCell>
                          <TableCell>
                            <div className="space-y-2 text-sm text-card-foreground">
                              <Badge>{row.source?.kind ?? 'file_import'}</Badge>
                              {row.source?.traceId ? (
                                <Button variant="outline" size="sm" asChild>
                                  <Link href={`/traces/${row.source.traceId}`}>
                                    Trace {row.source.externalTraceId ?? row.source.traceId}
                                  </Link>
                                </Button>
                              ) : (
                                <p>Imported from file</p>
                              )}
                              {row.metadata ? (
                                <pre className="overflow-x-auto rounded-lg border border-border bg-card p-2 text-xs text-muted-foreground">
                                  {JSON.stringify(row.metadata, null, 2)}
                                </pre>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-2 text-sm text-card-foreground">
                              <p>Input: {row.source?.inputRetentionMode ?? 'n/a'}</p>
                              <p>Output: {row.source?.outputRetentionMode ?? 'n/a'}</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="rounded-xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
                    No rows yet. Import a file or export a trace into this dataset.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
