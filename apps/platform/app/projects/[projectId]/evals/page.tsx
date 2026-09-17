import Link from 'next/link';
import { notFound } from 'next/navigation';

import { FolderOpen } from '../../../../components/icons';

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
  const [project, reviews] = await Promise.all([
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
            <BreadcrumbPage>Backfills</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="grid gap-6">
        <Card>
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CardTitle>Backfill reviews</CardTitle>
                <Badge>{project._count.manualEvals}</Badge>
              </div>
              <CardDescription>
                Review production data work before and after execution for{' '}
                <span className="font-medium text-card-foreground">{project.name}</span>. Existing
                review records remain stored in the legacy eval model while the platform transitions.
              </CardDescription>
            </div>
            <Button variant="outline" asChild>
              <Link href={`/projects/${project.id}`}>Back to project</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {reviews.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contract</TableHead>
                    <TableHead>Review runs</TableHead>
                    <TableHead>Reviewed</TableHead>
                    <TableHead>Pass rate</TableHead>
                    <TableHead>Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reviews.map((review) => (
                    <TableRow key={review.id}>
                      <TableCell>
                        <Button variant="outline" asChild>
                          <Link href={`/projects/${project.id}/evals/${review.id}`}>
                            {review.name}
                          </Link>
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" asChild>
                          <Link href={`/projects/${project.id}/datasets/${review.dataset.id}`}>
                            {review.dataset.name}
                          </Link>
                        </Button>
                      </TableCell>
                      <TableCell>{review.runCount}</TableCell>
                      <TableCell>
                        {review.metrics.reviewedRows}/{review.metrics.totalRows}
                      </TableCell>
                      <TableCell>{(review.metrics.passRate * 100).toFixed(1)}%</TableCell>
                      <TableCell>{formatTimestamp(review.updatedAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="rounded-xl border border-dashed border-border p-8 text-center">
                <FolderOpen className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-2 text-muted-foreground">No backfill reviews yet.</p>
                <p className="text-sm text-muted-foreground">
                  Start from a saved contract or execution evidence set when you need a human review
                  before or after risky production work.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}