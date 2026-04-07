import { notFound } from "next/navigation";

import { AppShell } from "../../../components/app-shell";
import { Badge } from "../../../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Separator } from "../../../components/ui/separator";
import { requireUser } from "../../../lib/auth-guard";
import { getTraceById } from "../../../lib/platform";

export const dynamic = "force-dynamic";

export default async function TracePage({
  params,
}: {
  params: Promise<{ traceId: string }>;
}) {
  const user = await requireUser();
  const { traceId } = await params;
  const trace = await getTraceById(traceId, user.id);

  if (!trace) {
    notFound();
  }

  return (
    <AppShell userName={user.email}>
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>{trace.model ?? "Unknown model"}</CardTitle>
                <p className="mt-1 text-sm text-slate-400">{trace.provider ?? "Unknown provider"}</p>
              </div>
              <Badge>{trace.status}</Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="text-sm text-slate-400">Estimated</p>
              <p className="text-xl font-semibold">${Number(trace.estimatedCostUsd).toFixed(4)}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="text-sm text-slate-400">Actual</p>
              <p className="text-xl font-semibold">${Number(trace.actualCostUsd).toFixed(4)}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="text-sm text-slate-400">Input tokens</p>
              <p className="text-xl font-semibold">{trace.inputTokens ?? 0}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="text-sm text-slate-400">Output tokens</p>
              <p className="text-xl font-semibold">{trace.outputTokens ?? 0}</p>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <CardHeader>
              <CardTitle>Trace timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {trace.events.map((event) => (
                <div key={event.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="font-medium">{event.type}</div>
                    <div className="text-xs text-slate-500">{event.timestamp.toISOString()}</div>
                  </div>
                  <Separator className="my-3" />
                  <pre className="text-xs text-slate-300">{JSON.stringify(event.data, null, 2)}</pre>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Prompt payload</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm">
                  {trace.promptPayload?.contentRedacted ?? "No prompt payload"}
                </pre>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Response payload</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm">
                  {trace.responsePayload?.contentRedacted ?? "No response payload"}
                </pre>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
