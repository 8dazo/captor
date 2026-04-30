import Link from 'next/link';
import { notFound } from 'next/navigation';

import { FolderOpen } from 'lucide-react';

import { AppShell } from '../../../../components/app-shell';
import { Badge } from '../../../../components/ui/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../../../../components/ui/breadcrumb';
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
            <BreadcrumbPage>Evals</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

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
                <span className="font-medium text-card-foreground">{project.name}</span>.
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
                        <Button variant="outline" asChild>
                          <Link href={`/projects/${project.id}/evals/${manualEval.id}`}>
                            {manualEval.name}
                          </Link>
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" asChild>
                          <Link href={`/projects/${project.id}/datasets/${manualEval.dataset.id}`}>
                            {manualEval.dataset.name}
                          </Link>
                        </Button>
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
              <div className="rounded-xl border border-dashed border-border p-8 text-center">
                <FolderOpen className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-2 text-muted-foreground">No manual evals yet.</p>
                <p className="text-sm text-muted-foreground">
                  Open a dataset and create one from its rows.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
