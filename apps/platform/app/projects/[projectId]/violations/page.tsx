import { AlertTriangle, Ban, Search, ShieldAlert, Waypoints } from '../../../../components/icons';
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
import { getProjectViolationExplorer } from '../../../../lib/violations';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US').format(value);
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(value);
}

function eventVariant(eventType: string) {
  if (eventType.endsWith('.blocked')) return 'status_blocked' as const;
  if (eventType.endsWith('.failed')) return 'status_failed' as const;
  return 'status_pending' as const;
}

const selectClassName =
  'h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm outline-none transition focus-visible:ring-1 focus-visible:ring-ring';

export default async function ProjectViolationsPage({
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

  const explorer = await getProjectViolationExplorer(projectId, user.id, {
    query: firstValue(queryParams.q),
    category: firstValue(queryParams.category),
    eventType: firstValue(queryParams.eventType),
    provider: firstValue(queryParams.provider),
    model: firstValue(queryParams.model),
    hookId: firstValue(queryParams.hook),
  });

  const hasFilters = Object.values(explorer.filters).some(Boolean);

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
              <BreadcrumbPage>Guardrails</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <Card>
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CardTitle>Guardrail explorer</CardTitle>
                <Badge>Project-wide</Badge>
              </div>
              <CardDescription>
                Investigate blocked requests, tool violations, execution failures, and policy events
                across every hook in <strong>{project.name}</strong>.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" asChild>
                <Link href={`/projects/${projectId}/traces`}>View traces</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href={`/projects/${projectId}/dashboard`}>Back to dashboard</Link>
              </Button>
            </div>
          </CardHeader>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Matching violations"
            value={formatNumber(explorer.summary.totalCount)}
            icon={<ShieldAlert className="h-4 w-4" />}
          />
          <MetricCard
            label="Blocked events"
            value={formatNumber(explorer.summary.blockedCount)}
            icon={<Ban className="h-4 w-4" />}
          />
          <MetricCard
            label="Execution failures"
            value={formatNumber(explorer.summary.failedCount)}
            icon={<AlertTriangle className="h-4 w-4" />}
          />
          <MetricCard
            label="Affected traces"
            value={formatNumber(explorer.summary.affectedTraceCount)}
            icon={<Waypoints className="h-4 w-4" />}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>
              Filter state lives in the URL, so an investigation can be bookmarked or shared.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-3 xl:grid-cols-[minmax(220px,1.6fr)_repeat(5,minmax(140px,1fr))_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  name="q"
                  defaultValue={explorer.filters.query ?? ''}
                  placeholder="Message, trace, provider, model…"
                  className="pl-9"
                />
              </div>

              <select
                name="category"
                aria-label="Category"
                defaultValue={explorer.filters.category ?? ''}
                className={selectClassName}
              >
                <option value="">All categories</option>
                {explorer.facets.categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>

              <select
                name="eventType"
                aria-label="Event type"
                defaultValue={explorer.filters.eventType ?? ''}
                className={selectClassName}
              >
                <option value="">All event types</option>
                {explorer.facets.eventTypes.map((eventType) => (
                  <option key={eventType} value={eventType}>
                    {eventType}
                  </option>
                ))}
              </select>

              <select
                name="provider"
                aria-label="Provider"
                defaultValue={explorer.filters.provider ?? ''}
                className={selectClassName}
              >
                <option value="">All providers</option>
                {explorer.facets.providers.map((provider) => (
                  <option key={provider} value={provider}>
                    {provider}
                  </option>
                ))}
              </select>

              <select
                name="model"
                aria-label="Model"
                defaultValue={explorer.filters.model ?? ''}
                className={selectClassName}
              >
                <option value="">All models</option>
                {explorer.facets.models.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>

              <select
                name="hook"
                aria-label="Hook"
                defaultValue={explorer.filters.hookId ?? ''}
                className={selectClassName}
              >
                <option value="">All hooks</option>
                {explorer.facets.hooks.map((hook) => (
                  <option key={hook.publicId} value={hook.publicId}>
                    {hook.name} · {hook.environment}
                  </option>
                ))}
              </select>

              <div className="flex gap-2">
                <Button type="submit">Apply</Button>
                {hasFilters ? (
                  <Button variant="outline" asChild>
                    <Link href={`/projects/${projectId}/violations`}>Reset</Link>
                  </Button>
                ) : null}
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle>Violations</CardTitle>
              <CardDescription>
                Showing {formatNumber(explorer.summary.visibleCount)} of{' '}
                {formatNumber(explorer.summary.totalCount)} matching events.
              </CardDescription>
            </div>
            {explorer.summary.isTruncated ? (
              <Badge variant="status_pending">Latest 100 shown</Badge>
            ) : null}
          </CardHeader>
          <CardContent>
            {explorer.violations.length ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Provider / model</TableHead>
                      <TableHead>Hook</TableHead>
                      <TableHead>Trace</TableHead>
                      <TableHead className="text-right">Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {explorer.violations.map((violation) => (
                      <TableRow key={violation.id}>
                        <TableCell className="align-top">
                          <div className="flex flex-col gap-1.5">
                            <Badge variant={eventVariant(violation.eventType)}>
                              {violation.eventType}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {violation.category}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-md align-top">
                          <p className="font-medium">{violation.message}</p>
                          {violation.llmSession ? (
                            <p className="mt-1 max-w-64 truncate font-mono text-[11px] text-muted-foreground">
                              {violation.llmSession.externalSessionId}
                            </p>
                          ) : null}
                        </TableCell>
                        <TableCell className="align-top">
                          <p className="text-sm font-medium">
                            {violation.trace?.provider ?? 'unknown'}
                          </p>
                          <p className="max-w-56 truncate text-xs text-muted-foreground">
                            {violation.trace?.model ?? 'unknown model'}
                          </p>
                        </TableCell>
                        <TableCell className="align-top">
                          <Link
                            href={`/hooks/${violation.hook.publicId}`}
                            className="text-sm font-medium hover:text-primary"
                          >
                            {violation.hook.name}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            {violation.hook.environment}
                          </p>
                        </TableCell>
                        <TableCell className="align-top">
                          {violation.trace ? (
                            <Link
                              href={`/traces/${violation.trace.id}`}
                              className="font-mono text-xs font-medium text-primary hover:text-primary/80"
                            >
                              {violation.trace.externalTraceId}
                            </Link>
                          ) : (
                            <span className="text-sm text-muted-foreground">No trace</span>
                          )}
                          {violation.trace?.requestId ? (
                            <p className="mt-1 max-w-48 truncate font-mono text-[11px] text-muted-foreground">
                              {violation.trace.requestId}
                            </p>
                          ) : null}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right text-sm text-muted-foreground align-top">
                          {formatDate(violation.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
                <p className="font-medium">No guardrail events match this view.</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {hasFilters
                    ? 'Reset or loosen the filters to continue the investigation.'
                    : 'Blocked requests, failures, and guardrail violations will appear here.'}
                </p>
                {hasFilters ? (
                  <Button variant="outline" className="mt-4" asChild>
                    <Link href={`/projects/${projectId}/violations`}>Clear filters</Link>
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
