import { notFound } from "next/navigation";

import { AppShell } from "../../../../../../../components/app-shell";
import { ManualEvalRunReviewer } from "../../../../../../../components/manual-eval-run-reviewer";
import { Badge } from "../../../../../../../components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../../../../../components/ui/card";
import { requireUser } from "../../../../../../../lib/auth-guard";
import { getProjectManualEvalRunById } from "../../../../../../../lib/platform";

export const dynamic = "force-dynamic";

export default async function ManualEvalRunPage({
  params,
}: {
  params: Promise<{ projectId: string; evalId: string; runId: string }>;
}) {
  const user = await requireUser();
  const { projectId, evalId, runId } = await params;
  const payload = await getProjectManualEvalRunById(projectId, evalId, runId, user.id);

  if (!payload) {
    notFound();
  }

  return (
    <AppShell userName={user.email}>
      <div className="grid gap-6">
        <Card>
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CardTitle>{payload.manualEval.name}</CardTitle>
                <Badge>{payload.run.status}</Badge>
              </div>
              <CardDescription>
                Reviewer workspace for dataset{" "}
                <span className="font-medium text-slate-200">{payload.dataset.name}</span>
              </CardDescription>
            </div>
            <div className="text-right text-sm text-slate-400">
              <p>Started {new Date(payload.run.createdAt).toISOString()}</p>
              <p>
                Completed{" "}
                {payload.run.completedAt
                  ? new Date(payload.run.completedAt).toISOString()
                  : "in progress"}
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
