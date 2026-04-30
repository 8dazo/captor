import Link from 'next/link';
import { notFound } from 'next/navigation';

import { AppShell } from '../../../../../../../components/app-shell';
import { ManualEvalRunReviewer } from '../../../../../../../components/manual-eval-run-reviewer';
import { Badge } from '../../../../../../../components/ui/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../../../../../../../components/ui/breadcrumb';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../../../../../components/ui/card';
import { requireUser } from '../../../../../../../lib/auth-guard';
import { getProjectById, getProjectManualEvalRunById } from '../../../../../../../lib/platform';
import { formatTimestamp } from '../../../../../../../lib/utils';

export const dynamic = 'force-dynamic';

export default async function ManualEvalRunPage({
  params,
}: {
  params: Promise<{ projectId: string; evalId: string; runId: string }>;
}) {
  const user = await requireUser();
  const { projectId, evalId, runId } = await params;
  const [project, payload] = await Promise.all([
    getProjectById(projectId, user.id),
    getProjectManualEvalRunById(projectId, evalId, runId, user.id),
  ]);

  if (!project || !payload) {
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
            <BreadcrumbLink asChild>
              <Link href={`/projects/${project.id}/evals`}>Evals</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={`/projects/${project.id}/evals/${payload.manualEval.id}`}>
                {payload.manualEval.name}
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Run {payload.run.id.slice(0, 8)}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="grid gap-6">
        <Card>
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CardTitle>{payload.manualEval.name}</CardTitle>
                <Badge>{payload.run.status}</Badge>
              </div>
              <CardDescription>
                Reviewer workspace for dataset{' '}
                <span className="font-medium text-card-foreground">{payload.dataset.name}</span>
              </CardDescription>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <p>Started {formatTimestamp(payload.run.createdAt)}</p>
              <p>
                Completed{' '}
                {payload.run.completedAt ? formatTimestamp(payload.run.completedAt) : 'in progress'}
              </p>
            </div>
          </CardHeader>
        </Card>

        <ManualEvalRunReviewer
          projectId={projectId}
          manualEval={payload.manualEval}
          initialRun={payload.run}
        />
      </div>
    </AppShell>
  );
}
