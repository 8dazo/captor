import Link from 'next/link';
import { notFound } from 'next/navigation';

import { AppShell } from '../../../../components/app-shell';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../../components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../../components/ui/table';
import { requireUser } from '../../../../lib/auth-guard';
import { formatTimestamp } from '../../../../lib/utils';
import { getProjectById, listProjectManualEvals } from '../../../../lib/platform';

export const dynamic = 'force-dynamic';

export default async function ProjectManualEvalsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const user = await requireUser();
  const { projectId } = await params;
  const [project, manualEvals] = await Promise.all([
    getProjectById(projectId, user.id),
    listProjectManualEvals(projectId, user.id),
  ]);

  if (!project) {
    notFound();
  }

  return (
    <AppShell userName={user.email}>
      <div className="grid gap-6">
        <Card>
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CardTitle>Manual evals</CardTitle>
                <Badge>{project._count.manualEvals}</Badge>
              </div>
              <CardDescription>
                Offline reviewer workflows for project{' '}
                <span className="font-medium text-slate-200">{project.name}</span>.
              </CardDescription>
            </div>
            <Button variant="outline" asChild>
              <Link href={`/projects/${project.id}`}>Back to project</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {manualEvals.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Dataset</TableHead>
                    <TableHead>Runs</TableHead>
                    <TableHead>Reviewed</TableHead>
                    <TableHead>Pass rate</TableHead>
                    <TableHead>Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {manualEvals.map((manualEval) => (
                    <TableRow key={manualEval.id}>
                      <TableCell>
                        <Link
                          className="font-medium text-cyan-300 hover:text-cyan-200"
                          href={`/projects/${project.id}/evals/${manualEval.id}`}
                        >
                          {manualEval.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link
                          className="text-slate-300 hover:text-slate-100"
                          href={`/projects/${project.id}/datasets/${manualEval.dataset.id}`}
                        >
                          {manualEval.dataset.name}
                        </Link>
                      </TableCell>
                      <TableCell>{manualEval.runCount}</TableCell>
                      <TableCell>
                        {manualEval.metrics.reviewedRows}/{manualEval.metrics.totalRows}
                      </TableCell>
                      <TableCell>{(manualEval.metrics.passRate * 100).toFixed(1)}%</TableCell>
                      <TableCell>{formatTimestamp(manualEval.updatedAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/60 p-6 text-sm text-slate-400">
                No manual evals yet. Open a dataset and create one from its rows.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
