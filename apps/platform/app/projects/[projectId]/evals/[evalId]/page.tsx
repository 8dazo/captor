import Link from 'next/link';
import { notFound } from 'next/navigation';

import { FolderOpen } from 'lucide-react';

import { AppShell } from '../../../../../components/app-shell';
import { ManualEvalStartRunButton } from '../../../../../components/manual-eval-start-run-button';
import { MetricCard } from '../../../../../components/metric-card';
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
import { getProjectById, getProjectManualEvalById } from '../../../../../lib/platform';
import { formatTimestamp } from '../../../../../lib/utils';

export const dynamic = 'force-dynamic';

export default async function ManualEvalDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; evalId: string }>;
}) {
  const user = await requireUser();
  const { projectId, evalId } = await params;
  const [project, payload] = await Promise.all([
    getProjectById(projectId, user.id),
    getProjectManualEvalById(projectId, evalId, user.id),
  ]);

  if (!project || !payload) {
    notFound();
  }

  const { manualEval, dataset, runs } = payload;

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
              <Link href={`/projects/${projectId}`}>{project.name}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={`/projects/${projectId}/evals`}>Evals</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{manualEval.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="grid gap-6">
        <Card>
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CardTitle>{manualEval.name}</CardTitle>
                <Badge>{manualEval.runCount} runs</Badge>
              </div>
              <CardDescription>
                Manual eval backed by dataset{' '}
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/projects/${projectId}/datasets/${dataset.id}`}>{dataset.name}</Link>
                </Button>
              </CardDescription>
              <p className="text-sm text-muted-foreground">
                {manualEval.description ?? 'No description yet.'}
              </p>
            </div>
            <div className="space-y-2">
              <ManualEvalStartRunButton
                projectId={projectId}
                manualEvalId={manualEval.id}
                disabled={!dataset.rows.length}
              />
              <Button variant="outline" asChild>
                <Link href={`/projects/${projectId}/evals`}>View all evals</Link>
              </Button>
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
                  : 'n/a'
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
                <div className="rounded-xl border border-border bg-card p-4 text-sm text-card-foreground">
                  {manualEval.reviewerInstructions}
                </div>
              ) : null}

              {manualEval.criteria.map((criterion) => {
                const metric = manualEval.metrics.criterionAverages.find(
                  (entry) => entry.criterionId === criterion.id
                );

                return (
                  <div key={criterion.id} className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium">{criterion.label}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {criterion.description ?? 'No description provided.'}
                        </p>
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        <p>Weight {criterion.weight}</p>
                        <p>
                          Avg{' '}
                          {metric?.averageScore != null ? metric.averageScore.toFixed(3) : 'n/a'}
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
                          <Button variant="outline" asChild>
                            <Link
                              href={`/projects/${projectId}/evals/${manualEval.id}/runs/${run.id}`}
                            >
                              {run.status}
                            </Link>
                          </Button>
                        </TableCell>
                        <TableCell>
                          {run.metrics.reviewedRows}/{run.metrics.totalRows}
                        </TableCell>
                        <TableCell>{(run.metrics.passRate * 100).toFixed(1)}%</TableCell>
                        <TableCell>{formatTimestamp(run.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="rounded-xl border border-dashed border-border p-8 text-center">
                  <FolderOpen className="mx-auto h-10 w-10 text-muted-foreground" />
                  <p className="mt-2 text-muted-foreground">No runs yet.</p>
                  <p className="text-sm text-muted-foreground">
                    Start the first reviewer pass when this rubric looks right.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
