import Link from "next/link";
import { notFound } from "next/navigation";
import { Activity, FolderKanban, ShieldCheck, Wallet } from "lucide-react";

import { AppShell } from "../../../components/app-shell";
import { HookCreateDialog } from "../../../components/hook-create-dialog";
import { Badge } from "../../../components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Separator } from "../../../components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../components/ui/table";
import { requireUser } from "../../../lib/auth-guard";
import { getProjectById } from "../../../lib/platform";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const user = await requireUser();
  const { projectId } = await params;
  const project = await getProjectById(projectId, user.id);

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
                <CardTitle>{project.name}</CardTitle>
                <Badge>{project.slug}</Badge>
              </div>
              <CardDescription>
                Projects group your hook connections, policies, sessions, traces, and spend analytics.
              </CardDescription>
            </div>
            <HookCreateDialog projectId={project.id} />
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="text-sm text-slate-400">Hook connections</p>
              <p className="text-2xl font-semibold">{project._count.hooks}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="text-sm text-slate-400">Sessions</p>
              <p className="text-2xl font-semibold">{project._count.sessions}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="text-sm text-slate-400">Policy scope</p>
              <p className="text-2xl font-semibold">{project.hooks.length}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="text-sm text-slate-400">Owner controls</p>
              <p className="text-2xl font-semibold">Ready</p>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
          <Card>
            <CardHeader>
              <CardTitle>Hook connections</CardTitle>
              <CardDescription>
                Use a hook ID in the SDK to sync policy and ingest traces into this project.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Hook ID</TableHead>
                    <TableHead>Environment</TableHead>
                    <TableHead>Retention</TableHead>
                    <TableHead>Signals</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {project.hooks.map((hook) => {
                    const activePolicy = hook.policies[0];
                    return (
                      <TableRow key={hook.id}>
                        <TableCell>
                          <Link
                            className="font-medium text-cyan-300 hover:text-cyan-200"
                            href={`/hooks/${hook.publicId}`}
                          >
                            {hook.name}
                          </Link>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{hook.publicId}</TableCell>
                        <TableCell>{hook.environment}</TableCell>
                        <TableCell>{hook.payloadRetention}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            <Badge>{hook._count.llmSessions} sessions</Badge>
                            <Badge>{hook._count.traces} traces</Badge>
                            <Badge>{hook._count.violations} violations</Badge>
                            {activePolicy ? <Badge>v{activePolicy.version}</Badge> : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>What this project manages</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-slate-300">
                <div className="flex items-start gap-3">
                  <FolderKanban className="mt-0.5 h-4 w-4 text-cyan-300" />
                  <p>Projects are the org-facing container for hooks, members, and runtime governance settings.</p>
                </div>
                <div className="flex items-start gap-3">
                  <Activity className="mt-0.5 h-4 w-4 text-cyan-300" />
                  <p>Each hook can ingest sessions, traces, token usage, prompts, responses, and violations.</p>
                </div>
                <div className="flex items-start gap-3">
                  <Wallet className="mt-0.5 h-4 w-4 text-cyan-300" />
                  <p>Spend is tracked from reserve to commit so budget enforcement stays visible in one place.</p>
                </div>
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 text-cyan-300" />
                  <p>Payload retention is redacted by default and policy sync happens through the hook ID.</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Integration pattern</CardTitle>
                <CardDescription>Drop the hook ID into your SDK config.</CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-200">
{`createCaptar({
  project: "${project.slug}",
  controlPlane: {
    hookId: "${project.hooks[0]?.publicId ?? "hook_your_project_dev"}",
    baseUrl: process.env.CAPTAR_CONTROL_PLANE_URL,
    syncPolicy: true,
  },
  exporter: {
    url: \`\${process.env.CAPTAR_CONTROL_PLANE_URL}/api/ingest\`,
  },
});`}
                </pre>
                <Separator className="my-4" />
                <p className="text-sm text-slate-400">
                  After calls land, open the hook detail page to inspect traces, payload retention, spend, and violations.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
