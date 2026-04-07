import Link from "next/link";
import { notFound } from "next/navigation";

import { AppShell } from "../../../components/app-shell";
import { Badge } from "../../../components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Separator } from "../../../components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { requireUser } from "../../../lib/auth-guard";
import { getHookByPublicId, summarizeHookAnalytics } from "../../../lib/platform";

export const dynamic = "force-dynamic";

export default async function HookPage({
  params,
}: {
  params: Promise<{ hookId: string }>;
}) {
  const user = await requireUser();
  const { hookId } = await params;
  const hook = await getHookByPublicId(hookId, user.id);

  if (!hook) {
    notFound();
  }

  const analytics = summarizeHookAnalytics(hook);
  const activePolicy = hook.policies.find((policy) => policy.isActive) ?? hook.policies[0];

  return (
    <AppShell userName={user.email}>
      <div className="grid gap-6">
        <Card>
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CardTitle>{hook.name}</CardTitle>
                <Badge>{hook.status}</Badge>
              </div>
              <CardDescription>
                Hook this ID into the SDK to sync policy and ingest sessions, traces, spend, prompts, responses, and violations.
              </CardDescription>
              <p className="font-mono text-xs text-cyan-300">{hook.publicId}</p>
            </div>
            <div className="text-sm text-slate-400">
              <p>Project: <Link className="text-cyan-300" href={`/projects/${hook.projectId}`}>{hook.project.name}</Link></p>
              <p>Environment: {hook.environment}</p>
              <p>Payload retention: {hook.payloadRetention}</p>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="text-sm text-slate-400">Committed spend</p>
              <p className="text-2xl font-semibold">${analytics?.committedUsd.toFixed(4) ?? "0.0000"}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="text-sm text-slate-400">Sessions</p>
              <p className="text-2xl font-semibold">{analytics?.sessionCount ?? 0}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="text-sm text-slate-400">Traces</p>
              <p className="text-2xl font-semibold">{analytics?.traceCount ?? 0}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="text-sm text-slate-400">Violations</p>
              <p className="text-2xl font-semibold">{analytics?.blockedCount ?? 0}</p>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="sessions">
          <TabsList>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
            <TabsTrigger value="traces">Traces</TabsTrigger>
            <TabsTrigger value="policy">Policy</TabsTrigger>
            <TabsTrigger value="violations">Violations</TabsTrigger>
          </TabsList>

          <TabsContent value="sessions">
            <Card>
              <CardHeader>
                <CardTitle>Recent sessions</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Session</TableHead>
                      <TableHead>Requests</TableHead>
                      <TableHead>Blocked</TableHead>
                      <TableHead>Committed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {hook.llmSessions.map((session) => (
                      <TableRow key={session.id}>
                        <TableCell className="font-mono text-xs">{session.externalSessionId}</TableCell>
                        <TableCell>{session.requestCount}</TableCell>
                        <TableCell>{session.blockedCount}</TableCell>
                        <TableCell>${Number(session.totalCommittedUsd).toFixed(4)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="traces">
            <Card>
              <CardHeader>
                <CardTitle>Recent traces</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {hook.traces.map((trace) => (
                  <Link key={trace.id} href={`/traces/${trace.id}`}>
                    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 transition hover:border-cyan-400/40">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-medium">{trace.model ?? "unknown model"}</p>
                          <p className="text-sm text-slate-400">{trace.provider ?? "unknown provider"}</p>
                        </div>
                        <Badge>{trace.status}</Badge>
                      </div>
                      <Separator className="my-4" />
                      <div className="grid gap-2 text-sm text-slate-300 md:grid-cols-3">
                        <p>Input tokens: {trace.inputTokens ?? 0}</p>
                        <p>Output tokens: {trace.outputTokens ?? 0}</p>
                        <p>Actual cost: ${Number(trace.actualCostUsd).toFixed(4)}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="policy">
            <Card>
              <CardHeader>
                <CardTitle>Active policy</CardTitle>
                <CardDescription>
                  This is what the SDK pulls when `syncPolicy` is enabled for the hook.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm">
                  {JSON.stringify(activePolicy?.policyJson ?? {}, null, 2)}
                </pre>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="violations">
            <Card>
              <CardHeader>
                <CardTitle>Violations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {hook.violations.map((violation) => (
                  <div key={violation.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                    <div className="flex items-center gap-2">
                      <Badge>{violation.category}</Badge>
                      <span className="text-sm text-slate-400">{violation.eventType}</span>
                    </div>
                    <p className="mt-3 font-medium">{violation.message}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
