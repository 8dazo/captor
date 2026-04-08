import Link from "next/link";
import { notFound } from "next/navigation";

import type { JsonValue } from "@captar/types";

import { AppShell } from "../../../../../components/app-shell";
import { DatasetImportForm } from "../../../../../components/dataset-import-form";
import { ManualEvalCreateForm } from "../../../../../components/manual-eval-create-form";
import { Badge } from "../../../../../components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../../../components/ui/table";
import { requireUser } from "../../../../../lib/auth-guard";
import { getProjectById, getProjectDatasetById, listDatasetManualEvals } from "../../../../../lib/platform";

export const dynamic = "force-dynamic";

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
      <div className="grid gap-6">
        <Card>
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CardTitle>{dataset.name}</CardTitle>
                <Badge>{dataset.rowCount} rows</Badge>
              </div>
              <CardDescription>
                Dataset in project{" "}
                <Link
                  className="text-cyan-300 hover:text-cyan-200"
                  href={`/projects/${project.id}`}
                >
                  {project.name}
                </Link>
              </CardDescription>
              <p className="text-sm text-slate-400">
                {dataset.description ?? "No description yet."}
              </p>
              <p className="text-sm text-slate-500">
                {manualEvals.length} manual eval(s) currently use this dataset.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                className="inline-flex items-center rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 transition hover:border-cyan-400/40 hover:text-cyan-200"
                href={`/projects/${project.id}/evals`}
              >
                Open evals
              </Link>
              <DatasetExportLink
                href={`/api/projects/${project.id}/datasets/${dataset.id}/export?format=json`}
                label="Export JSON"
              />
              <DatasetExportLink
                href={`/api/projects/${project.id}/datasets/${dataset.id}/export?format=jsonl`}
                label="Export JSONL"
              />
              <DatasetExportLink
                href={`/api/projects/${project.id}/datasets/${dataset.id}/export?format=csv`}
                label="Export CSV"
              />
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
                      className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <Link
                            className="font-medium text-cyan-300 hover:text-cyan-200"
                            href={`/projects/${project.id}/evals/${manualEval.id}`}
                          >
                            {manualEval.name}
                          </Link>
                          <p className="mt-1 text-sm text-slate-400">
                            {manualEval.description ?? "No description yet."}
                          </p>
                        </div>
                        <Badge>{manualEval.runCount} runs</Badge>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-400">
                        <span>
                          Reviewed {manualEval.metrics.reviewedRows}/{manualEval.metrics.totalRows}
                        </span>
                        <span>Pass rate {(manualEval.metrics.passRate * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/60 p-6 text-sm text-slate-400">
                    No manual evals yet. Create one from the form to the left.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Dataset rows</CardTitle>
                <CardDescription>
                  Rows stay append-only in v1 so trace exports, imports, and manual eval runs remain auditable.
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
                            <RowPayload value={row.input} />
                          </TableCell>
                          <TableCell>
                            <RowPayload value={row.output ?? null} emptyLabel="No output" />
                          </TableCell>
                          <TableCell>
                            <div className="space-y-2 text-sm text-slate-300">
                              <Badge>{row.source?.kind ?? "file_import"}</Badge>
                              {row.source?.traceId ? (
                                <Link
                                  className="block text-cyan-300 hover:text-cyan-200"
                                  href={`/traces/${row.source.traceId}`}
                                >
                                  Trace {row.source.externalTraceId ?? row.source.traceId}
                                </Link>
                              ) : (
                                <p>Imported from file</p>
                              )}
                              {row.metadata ? (
                                <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950 p-2 text-xs text-slate-400">
                                  {JSON.stringify(row.metadata, null, 2)}
                                </pre>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-2 text-sm text-slate-300">
                              <p>Input: {row.source?.inputRetentionMode ?? "n/a"}</p>
                              <p>Output: {row.source?.outputRetentionMode ?? "n/a"}</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/60 p-6 text-sm text-slate-400">
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

function DatasetExportLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <a
      className="inline-flex items-center rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 transition hover:border-cyan-400/40 hover:text-cyan-200"
      href={href}
    >
      {label}
    </a>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}

function RowPayload({
  value,
  emptyLabel = "No value",
}: {
  value: JsonValue | null;
  emptyLabel?: string;
}) {
  if (value == null) {
    return <p className="text-sm text-slate-500">{emptyLabel}</p>;
  }

  return (
    <pre className="max-w-[320px] overflow-x-auto whitespace-pre-wrap rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-slate-200">
      {typeof value === "string" ? value : JSON.stringify(value, null, 2)}
    </pre>
  );
}

function formatTimestamp(value: string) {
  return new Date(value).toISOString();
}
