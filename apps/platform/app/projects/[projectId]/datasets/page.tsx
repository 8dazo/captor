import Link from 'next/link';
import { notFound } from 'next/navigation';

import { AppShell } from '../../../../components/app-shell';
import { DatasetCreateForm } from '../../../../components/dataset-create-form';
import { Badge } from '../../../../components/ui/badge';
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
import { getProjectById, listProjectDatasets } from '../../../../lib/platform';

export const dynamic = 'force-dynamic';

export default async function ProjectDatasetsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const user = await requireUser();
  const { projectId } = await params;
  const [project, datasets] = await Promise.all([
    getProjectById(projectId, user.id),
    listProjectDatasets(projectId, user.id),
  ]);

  if (!project) {
    notFound();
  }

  return (
    <AppShell userName={user.email}>
      <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <DatasetCreateForm projectId={project.id} />

        <div className="grid gap-6">
          <Card>
            <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CardTitle>Project datasets</CardTitle>
                  <Badge>{project._count.datasets}</Badge>
                </div>
                <CardDescription>
                  Reusable rows exported from traces or appended from files for project{' '}
                  <span className="font-medium text-slate-200">{project.name}</span>.
                </CardDescription>
              </div>
              <Link
                className="text-sm text-cyan-300 hover:text-cyan-200"
                href={`/projects/${project.id}`}
              >
                Back to project
              </Link>
            </CardHeader>
            <CardContent>
              {datasets.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Rows</TableHead>
                      <TableHead>Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {datasets.map((dataset) => (
                      <TableRow key={dataset.id}>
                        <TableCell>
                          <Link
                            className="font-medium text-cyan-300 hover:text-cyan-200"
                            href={`/projects/${project.id}/datasets/${dataset.id}`}
                          >
                            {dataset.name}
                          </Link>
                        </TableCell>
                        <TableCell className="text-slate-300">
                          {dataset.description ?? 'No description'}
                        </TableCell>
                        <TableCell>{dataset.rowCount}</TableCell>
                        <TableCell>{formatTimestamp(dataset.updatedAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/60 p-6 text-sm text-slate-400">
                  No datasets yet. Create one and start exporting traces into it.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
