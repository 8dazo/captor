import { AlertTriangle } from '../../../components/icons';
import { notFound } from 'next/navigation';

import { AppShell } from '../../../components/app-shell';
import { CopyButton } from '../../../components/copy-button';
import { MetricCard } from '../../../components/metric-card';
import { TraceDatasetExportCard } from '../../../components/trace-dataset-export-card';
import { TraceAutoRefresh } from '../../../components/trace-auto-refresh';
import { Badge } from '../../../components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card';
import { Separator } from '../../../components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { requireUser } from '../../../lib/auth-guard';
import { cn, formatTimestamp } from '../../../lib/utils';
import {
  buildTraceSpanTree,
  buildTraceTimeline,
  flattenTraceSpanTree,
  getTraceProblemSpans,
  summarizeTraceFromSpans,
  type TraceProblemSpan,
  type TraceSpanNode,
  type TraceTimelineItem,
} from '../../../lib/trace-spans';
import { getTraceById, listProjectDatasets } from '../../../lib/platform';

export const dynamic = 'force-dynamic';

export default async function TracePage({ params }: { params: Promise<{ traceId: string }> }) {
  const user = await requireUser();
  const { traceId } = await params;
  const trace = await getTraceById(traceId, user.id);

  if (!trace) {
    notFound();
  }

  const datasets = await listProjectDatasets(trace.hook.projectId, user.id);

  const summary = summarizeTraceFromSpans(trace.spans, trace.spendEntries);
  const spanTree = buildTraceSpanTree(trace.spans);
  const flattenedSpans = flattenTraceSpanTree(spanTree);
  const problemSpans = getTraceProblemSpans(trace.spans);
  const timeline = buildTraceTimeline(trace.spans);
  const timelineWindowMs = Math.max(
    1,
    ...timeline.map((item) => item.offsetMs + (item.durationMs ?? 0))
  );
  const currentStatus = summary.status ?? trace.status;
  const hasProblems = problemSpans.length > 0 || trace.violations.length > 0;
  const firstProblem = problemSpans[0];
  const firstViolation = trace.violations[0];
  const shortTraceId = trace.externalTraceId.slice(0, 8);
  const breadCrumbs = trace.hook.name
    ? `Projects / ${trace.hook.name} / Trace ${shortTraceId}`
    : `Projects / Trace ${shortTraceId}`;

  return (
    <AppShell userName={user.email}>
      <div className="grid gap-6">
        <TraceAutoRefresh active={currentStatus === 'RUNNING'} />

        <div className="text-sm text-muted-foreground">{breadCrumbs}</div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CardTitle>{trace.externalTraceId}</CardTitle>
                  <CopyButton value={trace.externalTraceId} />
                  <Badge>{currentStatus}</Badge>
                </div>
                <CardDescription>
                  Trace for hook{' '}
                  <span className="font-mono text-xs text-primary">{trace.hook.publicId}</span>
                </CardDescription>
                <p className="text-sm text-muted-foreground">
                  Latest model: {trace.model ?? 'unknown'} · Provider: {trace.provider ?? 'unknown'}
                </p>
              </div>
              <div className="text-sm text-muted-foreground">
                <p>
                  Session:{' '}
                  <span className="font-mono text-xs">{trace.llmSession.externalSessionId}</span>
                </p>
                <p>Started: {formatTimestamp(summary.startedAt ?? trace.startedAt)}</p>
                <p>
                  Completed:{' '}
                  {summary.completedAt ? formatTimestamp(summary.completedAt) : 'running'}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-5">
            <MetricCard label="Estimated" value={formatUsd(summary.estimatedCostUsd)} />
            <MetricCard label="Actual" value={formatUsd(summary.actualCostUsd)} />
            <MetricCard label="Input tokens" value={String(summary.inputTokens)} />
            <MetricCard label="Output tokens" value={String(summary.outputTokens)} />
            <MetricCard label="Spans" value={String(trace.spans.length)} />
          </CardContent>
        </Card>

        {hasProblems ? (
          <Card className="border-destructive/40">
            <CardHeader>
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-destructive/10 p-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <CardTitle>Problem detected</CardTitle>
                  <CardDescription>
                    {problemSpans.length} failed or blocked span
                    {problemSpans.length === 1 ? '' : 's'}
                    {trace.violations.length
                      ? ` · ${trace.violations.length} recorded violation${trace.violations.length === 1 ? '' : 's'}`
                      : ''}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-border bg-muted/50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  First problem span
                </p>
                {firstProblem ? (
                  <div className="mt-2 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{firstProblem.name}</p>
                      <Badge variant={problemBadgeVariant(firstProblem.status)}>
                        {firstProblem.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {firstProblem.kind} · {formatDuration(firstProblem.durationMs)}
                      {firstProblem.provider ? ` · ${firstProblem.provider}` : ''}
                      {firstProblem.model ? ` · ${firstProblem.model}` : ''}
                    </p>
                    <p className="text-sm">
                      {firstProblem.error ??
                        'No error or reason attribute was captured on this span.'}
                    </p>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">
                    No failed or blocked span was captured.
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-border bg-muted/50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  First recorded violation
                </p>
                {firstViolation ? (
                  <div className="mt-2 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge>{firstViolation.category}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {firstViolation.eventType}
                      </span>
                    </div>
                    <p className="font-medium">{firstViolation.message}</p>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">
                    No violation record is attached to this trace.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <Card>
            <CardHeader>
              <CardTitle>Trace Debugger</CardTitle>
              <CardDescription>
                Explore the trace as a problem view, tree, timeline, or raw event stream.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue={hasProblems ? 'problems' : 'tree'}>
                <TabsList>
                  {hasProblems ? <TabsTrigger value="problems">Problems</TabsTrigger> : null}
                  <TabsTrigger value="tree">Tree</TabsTrigger>
                  <TabsTrigger value="timeline">Timeline</TabsTrigger>
                  <TabsTrigger value="events">Events</TabsTrigger>
                  <TabsTrigger value="violations">Violations</TabsTrigger>
                </TabsList>

                {hasProblems ? (
                  <TabsContent value="problems" className="pt-4">
                    <div className="space-y-4">
                      {problemSpans.map((problem) => (
                        <ProblemSpanCard key={problem.externalSpanId} problem={problem} />
                      ))}
                      {trace.violations.map((violation) => (
                        <div
                          key={violation.id}
                          className="rounded-xl border border-border bg-muted/50 p-4"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge>{violation.category}</Badge>
                            <Badge variant={violationBadgeVariant(violation.eventType)}>
                              {violation.eventType}
                            </Badge>
                          </div>
                          <p className="mt-3 font-medium">{violation.message}</p>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                ) : null}

                <TabsContent value="tree" className="pt-4">
                  {spanTree.length ? (
                    <div className="space-y-3">
                      {spanTree.map((node) => (
                        <TraceTreeNode key={node.externalSpanId} node={node} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No spans captured yet.</p>
                  )}
                </TabsContent>

                <TabsContent value="timeline" className="pt-4">
                  {timeline.length ? (
                    <div className="space-y-4">
                      {timeline.map((item) => (
                        <TraceTimelineRow
                          key={item.externalSpanId}
                          item={item}
                          timelineWindowMs={timelineWindowMs}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No timeline data captured yet.</p>
                  )}
                </TabsContent>

                <TabsContent value="events" className="pt-4">
                  <div className="space-y-4">
                    {trace.events.map((event) => (
                      <div
                        key={event.id}
                        className="rounded-xl border border-border bg-muted/50 p-4"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="font-medium">{event.type}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatTimestamp(event.timestamp)}
                          </div>
                        </div>
                        <Separator className="my-3" />
                        <pre className="overflow-x-auto text-xs text-muted-foreground">
                          {JSON.stringify(event.data, null, 2)}
                        </pre>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="violations" className="pt-4">
                  {trace.violations.length ? (
                    <div className="space-y-3">
                      {trace.violations.map((violation) => (
                        <div
                          key={violation.id}
                          className="rounded-xl border border-border bg-muted/50 p-4"
                        >
                          <div className="flex items-center gap-2">
                            <Badge>{violation.category}</Badge>
                            <span className="text-sm text-muted-foreground">
                              {violation.eventType}
                            </span>
                          </div>
                          <p className="mt-3 font-medium">{violation.message}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No violations recorded on this trace.
                    </p>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Span Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                {flattenedSpans.length ? (
                  flattenedSpans.map((span) => (
                    <div
                      key={span.externalSpanId}
                      className="rounded-xl border border-border bg-muted/50 p-3"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div
                          className={cn(
                            span.depth > 0 && 'border-l border-border pl-3',
                            span.depth > 1 && `pl-${Math.min(span.depth * 3, 12)}`
                          )}
                        >
                          <p className="font-medium">{span.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {span.kind} · {span.status}
                          </p>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          <p>{formatTimestamp(span.startedAt)}</p>
                          <p>{formatDuration(span.durationMs)}</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground">No span summaries available yet.</p>
                )}
              </CardContent>
            </Card>

            <TraceDatasetExportCard
              projectId={trace.hook.projectId}
              traceId={trace.id}
              datasets={datasets.map((dataset) => ({
                id: dataset.id,
                name: dataset.name,
                rowCount: dataset.rowCount,
              }))}
              disabledReason={datasetExportDisabledReason(trace)}
            />

            <Card>
              <CardHeader>
                <CardTitle>Prompt Payload</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="overflow-x-auto rounded-xl border border-border bg-muted p-4 text-sm">
                  {trace.promptPayload?.contentRedacted ?? 'No prompt payload'}
                </pre>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Response Payload</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="overflow-x-auto rounded-xl border border-border bg-muted p-4 text-sm">
                  {trace.responsePayload?.contentRedacted ?? 'No response payload'}
                </pre>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function ProblemSpanCard({ problem }: { problem: TraceProblemSpan }) {
  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{problem.name}</p>
            <Badge>{problem.kind}</Badge>
            <Badge variant={problemBadgeVariant(problem.status)}>{problem.status}</Badge>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {formatTimestamp(problem.startedAt)} · {formatDuration(problem.durationMs)}
          </p>
          <p className="mt-2 text-sm">
            {problem.error ?? 'No error or reason attribute was captured on this span.'}
          </p>
        </div>
        <div className="text-sm text-muted-foreground md:text-right">
          {problem.provider ? <p>Provider: {problem.provider}</p> : null}
          {problem.model ? <p>Model: {problem.model}</p> : null}
        </div>
      </div>
    </div>
  );
}

function TraceTreeNode({ node }: { node: TraceSpanNode }) {
  return (
    <div className={cn('space-y-3', node.depth > 0 && 'border-l border-border pl-4')}>
      <div className="rounded-xl border border-border bg-muted/50 p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium">{node.name}</p>
              <Badge>{node.kind}</Badge>
              <Badge>{node.status}</Badge>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Started {formatTimestamp(node.startedAt)} · {formatDuration(node.durationMs)}
            </p>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            {node.attributes.model ? <p>Model: {String(node.attributes.model)}</p> : null}
            {typeof node.attributes.costUsd === 'number' ? (
              <p>Cost: {formatUsd(node.attributes.costUsd)}</p>
            ) : null}
            {node.attributes.toolName ? <p>Tool: {String(node.attributes.toolName)}</p> : null}
          </div>
        </div>
      </div>

      {node.children.map((child) => (
        <TraceTreeNode key={child.externalSpanId} node={child} />
      ))}
    </div>
  );
}

function TraceTimelineRow({
  item,
  timelineWindowMs,
}: {
  item: TraceTimelineItem;
  timelineWindowMs: number;
}) {
  const left = (item.offsetMs / timelineWindowMs) * 100;
  const width = item.durationMs ? Math.max((item.durationMs / timelineWindowMs) * 100, 6) : 8;

  return (
    <div className="grid gap-2 md:grid-cols-[220px_minmax(0,1fr)] md:items-center">
      <div className="text-sm text-foreground">
        <p className="font-medium">{item.name}</p>
        <p className="text-xs text-muted-foreground">
          {item.kind} · {item.status} · {formatDuration(item.durationMs)}
        </p>
      </div>
      <div className="relative h-12 rounded-xl border border-border bg-muted">
        <div
          className={cn('absolute top-2 h-8 rounded-lg', statusBarClass(item.status))}
          style={{
            left: `${Math.min(left, 92)}%`,
            width: `${Math.min(width, 100 - Math.min(left, 92))}%`,
          }}
        />
      </div>
    </div>
  );
}

function problemBadgeVariant(status: string) {
  return status === 'BLOCKED' ? ('status_blocked' as const) : ('status_failed' as const);
}

function violationBadgeVariant(eventType: string) {
  if (eventType.endsWith('.blocked')) return 'status_blocked' as const;
  if (eventType.endsWith('.failed')) return 'status_failed' as const;
  return 'status_pending' as const;
}

function statusBarClass(status: string) {
  switch (status) {
    case 'FAILED':
      return 'bg-destructive/80';
    case 'BLOCKED':
      return 'bg-amber-500/80';
    case 'COMPLETED':
      return 'bg-primary/80';
    default:
      return 'bg-muted-foreground/80';
  }
}

function formatUsd(value: number) {
  return `$${value.toFixed(4)}`;
}

function formatDuration(value?: number) {
  if (typeof value !== 'number') {
    return 'running';
  }
  if (value < 1000) {
    return `${value}ms`;
  }
  return `${(value / 1000).toFixed(2)}s`;
}

function datasetExportDisabledReason(trace: {
  promptPayload?: {
    contentRaw?: string | null;
    contentRedacted?: string | null;
  } | null;
  responsePayload?: {
    contentRaw?: string | null;
    contentRedacted?: string | null;
  } | null;
}) {
  const prompt = trace.promptPayload?.contentRedacted ?? trace.promptPayload?.contentRaw ?? null;
  const response =
    trace.responsePayload?.contentRedacted ?? trace.responsePayload?.contentRaw ?? null;

  if (prompt == null && response == null) {
    return 'No retained prompt or response payload is available for this trace.';
  }

  return undefined;
}
