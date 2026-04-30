import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DollarSign, FileText, ShieldAlert, Users } from 'lucide-react';

import { AppShell } from '../../../components/app-shell';
import { CodeBlock } from '../../../components/code-block';
import { CopyButton } from '../../../components/copy-button';
import { MetricCard } from '../../../components/metric-card';
import { Button } from '../../../components/ui/button';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../../../components/ui/breadcrumb';
import { Badge } from '../../../components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card';
import { Separator } from '../../../components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../../components/ui/tooltip';
import { requireUser } from '../../../lib/auth-guard';
import { getHookByPublicId, summarizeHookAnalytics } from '../../../lib/platform';

export const dynamic = 'force-dynamic';

export default async function HookPage({ params }: { params: Promise<{ hookId: string }> }) {
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
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/projects">Projects</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{hook.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <Card>
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CardTitle>{hook.name}</CardTitle>
                <Badge>{hook.status}</Badge>
              </div>
              <CardDescription>
                Hook this ID into the SDK to sync policy and ingest sessions, traces, spend,
                prompts, responses, and violations.
              </CardDescription>
              <div className="flex items-center gap-2">
                <p className="font-mono text-xs text-primary">{hook.publicId}</p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <CopyButton value={hook.publicId} />
                    </TooltipTrigger>
                    <TooltipContent>Copy hook ID</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            <div className="space-y-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span>Project:</span>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/projects/${hook.projectId}`}>{hook.project.name}</Link>
                </Button>
              </div>
              <p>Environment: {hook.environment}</p>
              <p>Payload retention: {hook.payloadRetention}</p>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-4">
            <MetricCard
              label="Committed spend"
              value={`$${analytics?.committedUsd.toFixed(4) ?? '0.0000'}`}
              icon={<DollarSign className="h-4 w-4" />}
            />
            <MetricCard
              label="Sessions"
              value={String(analytics?.sessionCount ?? 0)}
              icon={<Users className="h-4 w-4" />}
            />
            <MetricCard
              label="Traces"
              value={String(analytics?.traceCount ?? 0)}
              icon={<FileText className="h-4 w-4" />}
            />
            <MetricCard
              label="Violations"
              value={String(analytics?.blockedCount ?? 0)}
              icon={<ShieldAlert className="h-4 w-4" />}
            />
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
                        <TableCell className="font-mono text-xs">
                          {session.externalSessionId}
                        </TableCell>
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
                  <Link
                    key={trace.id}
                    href={`/traces/${trace.id}`}
                    aria-label={`View trace ${trace.model ?? 'unknown model'}`}
                  >
                    <div className="rounded-xl border border-border bg-card/60 p-4 transition hover:border-primary/40">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-medium">{trace.model ?? 'unknown model'}</p>
                          <p className="text-sm text-muted-foreground">
                            {trace.provider ?? 'unknown provider'}
                          </p>
                        </div>
                        <Badge>{trace.status}</Badge>
                      </div>
                      <Separator className="my-4" />
                      <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-3">
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
                <CodeBlock language="json">
                  {JSON.stringify(activePolicy?.policyJson ?? {}, null, 2)}
                </CodeBlock>
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
                  <div
                    key={violation.id}
                    className="rounded-xl border border-border bg-card/60 p-4"
                  >
                    <div className="flex items-center gap-2">
                      <Badge>{violation.category}</Badge>
                      <span className="text-sm text-muted-foreground">{violation.eventType}</span>
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
