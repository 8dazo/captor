import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AppShell } from '../../../../../components/app-shell';
import { ExecutionReceiptDetail } from '../../../../../components/execution-receipt-detail';
import { Button } from '../../../../../components/ui/button';
import { requireUser } from '../../../../../lib/auth-guard';
import { getProjectById } from '../../../../../lib/platform';
import { getExecutionRun } from '../../../../../lib/execution-runs';

export const dynamic = 'force-dynamic';

export default async function RunDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; runId: string }>;
}) {
  const user = await requireUser();
  const { projectId, runId } = await params;
  const [project, run] = await Promise.all([
    getProjectById(projectId, user.id),
    getExecutionRun(projectId, user.id, runId),
  ]);
  if (!project || !run) notFound();
  return (
    <AppShell userName={user.email} projectId={projectId} projectName={project.name}>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link
            className="text-sm text-muted-foreground hover:underline"
            href={`/projects/${projectId}/runs`}
          >
            {project.name} / Runs
          </Link>
          <h1 className="mt-2 break-words text-2xl font-semibold">{run.name}</h1>
        </div>
        <Button variant="outline" asChild>
          <a href={`/api/projects/${projectId}/runs/${run.id}/receipt`} download>
            Download receipt
          </a>
        </Button>
      </header>
      <ExecutionReceiptDetail receipt={run.data} importedAt={run.importedAt.toISOString()} />
    </AppShell>
  );
}
