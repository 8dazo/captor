import Link from "next/link";
import { notFound } from "next/navigation";

import { AppShell } from "../../../../../components/app-shell";
import { ManualEvalStartRunButton } from "../../../../../components/manual-eval-start-run-button";
import { Badge } from "../../../../../components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../../../components/ui/table";
import { requireUser } from "../../../../../lib/auth-guard";
import { getProjectManualEvalById } from "../../../../../lib/platform";

export const dynamic = "force-dynamic";

export default async function ManualEvalDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; evalId: string }>;
}) {
  const user = await requireUser();
  const { projectId, evalId } = await params;
  const payload = await getProjectManualEvalById(projectId, evalId, user.id);

  if (!payload) {
    notFound();
  }

  const { manualEval, dataset, runs } = payload;

  return (
    <AppShell userName={user.email}>
      <div className="grid gap-6">
        <Card>
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CardTitle>{manualEval.name}</CardTitle>
                <Badge>{manualEval.runCount} runs</Badge>
              </div>
              <CardDescription>
                Manual eval backed by dataset{" "}
                <Link
                  className="text-cyan-300 hover:text-cyan-200"
                  href={`/projects/${projectId}/datasets/${dataset.id}`}
                >
                  {dataset.name}
                </Link>
              </CardDescription>
              <p className="text-sm text-slate-400">
                {manualEval.description ?? "No description yet."}
              </p>
            </div>
            <div className="space-y-2">
              <ManualEvalStartRunButton
                projectId={projectId}
                manualEvalId={manualEval.id}
                disabled={!dataset.rows.length}
              />
              <Link
                className="block text-sm text-cyan-300 hover:text-cyan-200"
                href={`/projects/${projectId}/evals`}
              >
                View all evals
              </Link>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-4">
            <MetricCard label="Dataset rows" value={String(dataset.rowCount)} />
            <MetricCard label="Reviewed" value={String(manualEval.metrics.reviewedRows)} />
            <MetricCard label="Pending" value={String(manualEval.metrics.pendingRows)} />
            <MetricCard
              label="Average score"
              value={
                manualEval.metrics.overallAverageScore != null
                  ? manualEval.metrics.overallAverageScore.toFixed(3)
                  : "n/a"
              }
            />
          </CardContent>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <Card>
            <CardHeader>
              <CardTitle>Rubric</CardTitle>
              <CardDescription>
                Reviewers score each row against these weighted criteria.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {manualEval.reviewerInstructions ? (
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-300">
                  {manualEval.reviewerInstructions}
                </div>
              ) : null}

              {manualEval.criteria.map((criterion) => {
                const metric = manualEval.metrics.criterionAverages.find(
                  (entry) => entry.criterionId === criterion.id,
                );

                return (
                  <div
                    key={criterion.id}
                    className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium">{criterion.label}</p>
                        <p className="mt-1 text-sm text-slate-400">
                          {criterion.description ?? "No description provided."}
                        </p>
                      </div>
                      <div className="text-right text-sm text-slate-300">
                        <p>Weight {criterion.weight}</p>
                        <p>
                          Avg {metric?.averageScore != null ? metric.averageScore.toFixed(3) : "n/a"}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent runs</CardTitle>
              <CardDescription>
                Each run freezes the dataset membership present at kickoff.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {runs.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Reviewed</TableHead>
                      <TableHead>Pass rate</TableHead>
                      <TableHead>Started</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {runs.map((run) => (
                      <TableRow key={run.id}>
                        <TableCell>
                          <Link
                            className="font-medium text-cyan-300 hover:text-cyan-200"
                            href={`/projects/${projectId}/evals/${manualEval.id}/runs/${run.id}`}
                          >
                            {run.status}
                          </Link>
                        </TableCell>
                        <TableCell>
                          {run.metrics.reviewedRows}/{run.metrics.totalRows}
                        </TableCell>
                        <TableCell>{(run.metrics.passRate * 100).toFixed(1)}%</TableCell>
                        <TableCell>{new Date(run.createdAt).toISOString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/60 p-6 text-sm text-slate-400">
                  No runs yet. Start the first reviewer pass when this rubric looks right.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
    </div>
  );
}
