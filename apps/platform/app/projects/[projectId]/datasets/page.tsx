import Link from 'next/link';
import { notFound } from 'next/navigation';

import { AppShell } from '../../../../components/app-shell';
import { DatasetCreateForm } from '../../../../components/dataset-create-form';
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
import { getProjectById, listProjectDatasets } from '../../../../lib/platform';

export const dynamic = 'force-dynamic';

export default async function ProjectDatasetsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const user = await requireUser();
  const { projectId } = await params;
  const [project, contracts] = await Promise.all([
    getProjectById(projectId, user.id),
    listProjectDatasets(projectId, user.id),
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
            <BreadcrumbPage>Contracts</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <DatasetCreateForm projectId={project.id} />

        <div className="grid gap-6">
          <Card>
            <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CardTitle>Saved contracts</CardTitle>
                  <Badge>{project._count.datasets}</Badge>
                </div>
                <CardDescription>
                  Reusable execution definitions and review sets for project{' '}
                  <span className="font-medium text-card-foreground">{project.name}</span>. The
                  existing dataset storage remains as a compatibility layer while the platform moves
                  to execution contracts.
                </CardDescription>
              </div>
              <Button variant="outline" asChild>
                <Link href={`/projects/${project.id}`}>Back to project</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {contracts.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Purpose</TableHead>
                      <TableHead>Evidence rows</TableHead>
                      <TableHead>Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contracts.map((contract) => (
                      <TableRow key={contract.id}>
                        <TableCell>
                          <Button variant="outline" asChild>
                            <Link href={`/projects/${project.id}/datasets/${contract.id}`}>
                              {contract.name}
                            </Link>
                          </Button>
                        </TableCell>
                        <TableCell className="text-card-foreground">
                          {contract.description ?? 'Execution contract evidence and reusable run inputs'}
                        </TableCell>
                        <TableCell>{contract.rowCount}</TableCell>
                        <TableCell>{formatTimestamp(contract.updatedAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="rounded-xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
                  No saved contracts yet. Start with the local SDK; hosted contracts are optional and
                  become useful when a team wants shared execution definitions and evidence.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}