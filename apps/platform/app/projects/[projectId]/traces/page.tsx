import { Activity, AlertTriangle, DollarSign, Search, ShieldX } from '../../../../components/icons';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { AppShell } from '../../../../components/app-shell';
import { MetricCard } from '../../../../components/metric-card';
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
import { Input } from '../../../../components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../../components/ui/table';
import { requireUser } from '../../../../lib/auth-guard';
import { getProjectById } from '../../../../lib/platform';
import { getProjectTraceExplorer } from '../../../../lib/traces';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(value ?? 0);
}

function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat('en-US').format(value ?? 0);
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(value);
}

function statusVariant(
  status: string
): 'status_completed' | 'status_failed' | 'status_blocked' | 'status_pending' {
  if (status === 'COMPLETED') return 'status_completed';
  if (status === 'FAILED') return 'status_failed';
  if (status === 'BLOCKED') return 'status_blocked';
  return 'status_pending';
}

const selectClassName =
  'h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm outline-none transition focus-visible:ring-1 focus-visible:ring-ring';

export default async function ProjectTracesPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: SearchParams;
}) {
  const user = await requireUser();
  const { projectId } = await params;
  const queryParams = await searchParams;
  const project = await getProjectById(projectId, user.id);

  if (!project) {
    notFound();
  }

  const explorer = await getProjectTraceExplorer(projectId, user.id, {
    query: firstValue(queryParams.q),
    provider: firstValue(queryParams.provider),
    model: firstValue(queryParams.model),
    status: firstValue(queryParams.status),
  });

  const hasFilters = Boolean(
    explorer.filters.query ||
    explorer.filters.provider ||
    explorer.filters.model ||
    explorer.filters.status
  );

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
              <BreadcrumbLink asChild>
                <Link href={`/projects/${projectId}`}>{project.name}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Runs</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <Card>
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CardTitle>Run explorer</CardTitle>
                <Badge>Project-wide</Badge>
              </div>
              <CardDescription>
                Search execution evidence across every connected runtime in{' '}
                <strong>{project.name}</strong>. Legacy trace records remain the storage layer while
                generic execution receipts are rolled out.
              </CardDescription>
            </div>
            <Button variant="outline" asChild>
              <Link href={`/projects/${projectId}/dashboard`}>Back to run dashboard</Link>
            </Button>
          </CardHeader>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Matching runs"
            value={formatNumber(explorer.summary.totalCount)}
            icon={<Activity className="h-4 w-4" />}
          />
          <MetricCard
            label="Committed cost"
            value={formatCurrency(explorer.summary.committedUsd)}
            icon={<DollarSign className="h-4 w-4" />}
            variant="primary"
          />
          <MetricCard
            label="Blocked by contract"
            value={formatNumber(explorer.summary.blockedCount)}
            icon={<ShieldX className="h-4 w-4" />}
          />
          <MetricCard
            label="Failed outcome"
            value={formatNumber(explorer.summary.failedCount)}
            icon={<AlertTriangle className="h-4 w-4" />}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>
              Filters stay in the URL so a run view can be bookmarked or shared during an incident
              or review.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-3 lg:grid-cols-[minmax(220px,1.6fr)_repeat(3,minmax(150px,1fr))_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  name="q"
                  defaultValue={explorer.filters.query ?? ''}
                  placeholder="Run ID, request ID, source, model…"
                  className="pl-9"
                />
              </div>
              <select
                name="provider"
                aria-label="Runtime source"
                defaultValue={explorer.filters.provider ?? ''}
                className={selectClassName}
              >
                <option value="">All sources</option>
                {explorer.facets.providers.map((provider) => (
                  <option key={provider} value={provider}>
                    {provider}
                  </option>
                ))}
              </select>
              <select
                name="status"
                aria-label="Status"
                defaultValue={explorer.filters.status ?? ''}
                className={selectClassName}
              >
                <option value="">All statuses</option>
                {explorer.facets.statuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <select
                name="model"
                aria-label="Adapter detail"
                defaultValue={explorer.filters.model ?? ''}
                className={selectClassName}
              >
                <option value="">All adapter details</option>
                {explorer.facets.models.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <Button type="submit">Apply</Button>
                {hasFilters ? (
                  <Button variant="outline" asChild>
                    <Link href={`/projects/${projectId}/traces`}>Reset</Link>
                  </Button>
                ) : null}
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle>Runs</CardTitle>
              <CardDescription>
                Showing {formatNumber(explorer.summary.visibleCount)} of{' '}
                {formatNumber(explorer.summary.totalCount)} matching executions.
              </CardDescription>
            </div>
            {explorer.summary.isTruncated ? (
              <Badge variant="status_pending">Latest 100 shown</Badge>
            ) : null}
          </CardHeader>
          <CardContent>
            {explorer.traces.length ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Run</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Source / adapter</TableHead>
                      <TableHead>Runtime</TableHead>
                      <TableHead className="text-right">Measured work</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                      <TableHead className="text-right">Started</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {explorer.traces.map((trace) => {
                      const actualCost = Number(trace.actualCostUsd ?? 0);
                      const estimatedCost = Number(trace.estimatedCostUsd ?? 0);
                      const isRunning = trace.status === 'RUNNING';
                      const showEstimate = isRunning && actualCost === 0 && estimatedCost > 0;
                      const displayedCost = showEstimate ? estimatedCost : actualCost;

                      return (
                        <TableRow key={trace.id}>
                          <TableCell>
                            <Link
                              href={`/traces/${trace.id}`}
                              className="font-mono text-xs font-medium text-primary hover:text-primary/80"
                            >
                              {trace.externalTraceId}
                            </Link>
                            {trace.requestId ? (
                              <p className="mt-1 max-w-48 truncate font-mono text-[11px] text-muted-foreground">
                                {trace.requestId}
                              </p>
                            ) : null}
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusVariant(trace.status)}>{trace.status}</Badge>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm font-medium">{trace.provider ?? 'generic'}</p>
                            <p className="max-w-64 truncate text-xs text-muted-foreground">
                              {trace.model ?? 'execution adapter'}
                            </p>
                          </TableCell>
                          <TableCell>
                            <Link
                              href={`/hooks/${trace.hook.publicId}`}
                              className="text-sm font-medium hover:text-primary"
                            >
                              {trace.hook.name}
                            </Link>
                            <p className="text-xs text-muted-foreground">
                              {trace.hook.environment}
                            </p>
                          </TableCell>
                          <TableCell className="text-right text-sm tabular-nums">
                            {formatNumber(trace.inputTokens)} in /{' '}
                            {formatNumber(trace.outputTokens)} out
                          </TableCell>
                          <TableCell className="text-right text-sm font-medium tabular-nums">
                            {formatCurrency(displayedCost)}
                            {showEstimate ? (
                              <p className="text-[11px] font-normal text-muted-foreground">
                                estimated
                              </p>
                            ) : null}
                          </TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">
                            {formatDate(trace.startedAt)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
                <p className="font-medium">No runs match this view.</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {hasFilters
                    ? 'Reset or loosen the filters to see more execution activity.'
                    : 'Local Captor works without the hosted platform. Connect a runtime only when you want shared run history and team controls.'}
                </p>
                {hasFilters ? (
                  <Button variant="outline" className="mt-4" asChild>
                    <Link href={`/projects/${projectId}/traces`}>Clear filters</Link>
                  </Button>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
