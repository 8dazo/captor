import { Activity, Database, DollarSign, LineChart, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import React from 'react';

import { AppShell } from '../../../../components/app-shell';
import { Badge } from '../../../../components/ui/badge';
import { buttonVariants } from '../../../../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../../components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../../components/ui/table';
import { requireUser } from '../../../../lib/auth-guard';
import {
  getProjectById,
  getProjectDashboardMetrics,
  getRecentTraces,
  getSpendSummary,
} from '../../../../lib/platform';
import { cn } from '../../../../lib/utils';

export const dynamic = 'force-dynamic';

function formatCurrency(value: number | null | undefined) {
  if (value == null || value === 0) return '$0.00';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

function formatNumber(value: number | null | undefined) {
  if (value == null) return '0';
  return new Intl.NumberFormat('en-US').format(value);
}

function StatusBadge({ status }: { status: string }) {
  const variant =
    status === 'COMPLETED'
      ? 'bg-emerald-900/60 text-emerald-300 border-emerald-800'
      : status === 'FAILED'
        ? 'bg-red-900/60 text-red-300 border-red-800'
        : status === 'BLOCKED'
          ? 'bg-orange-900/60 text-orange-300 border-orange-800'
          : 'bg-slate-800 text-slate-300 border-slate-700';

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
        variant
      )}
    >
      {status}
    </span>
  );
}

function decimalOrNumber(value: unknown): number {
  if (value == null) return 0;
  return typeof value === 'number' ? value : Number(value);
}

export default async function ProjectDashboardPage({
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

  const [metrics, recentTraces, spendSummary] = await Promise.all([
    getProjectDashboardMetrics(projectId),
    getRecentTraces(projectId, 5),
    getSpendSummary(projectId, 30),
  ]);

  return (
    <AppShell userName={user.email}>
      <div className="grid gap-6">
        {/* Header */}
        <Card>
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CardTitle>Dashboard</CardTitle>
                <Badge>Project</Badge>
              </div>
              <CardDescription>
                Project overview for <strong>{project.name}</strong> with aggregated traces,
                datasets, spend, and recent activity.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                className={cn(buttonVariants({ size: 'sm', variant: 'outline' }), 'gap-1')}
                href={`/projects/${projectId}/datasets`}
              >
                <Database className="h-4 w-4" />
                Datasets
              </Link>
              <Link
                className={cn(buttonVariants({ size: 'sm', variant: 'outline' }), 'gap-1')}
                href={`/projects/${projectId}/evals`}
              >
                <LineChart className="h-4 w-4" />
                Evals
              </Link>
            </div>
          </CardHeader>
        </Card>

        {/* Metric cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Traces"
            value={metrics.tracesCount}
            icon={Activity}
            href={`/projects/${projectId}/hooks`}
          />
          <MetricCard
            label="Datasets"
            value={metrics.datasetsCount}
            icon={Database}
            href={`/projects/${projectId}/datasets`}
          />
          <MetricCard
            label="Eval runs"
            value={metrics.evalRunsCount}
            icon={LineChart}
            href={`/projects/${projectId}/evals`}
          />
          <MetricCard
            label="Hooks"
            value={metrics.hooksCount}
            icon={ShieldCheck}
            href={`/projects/${projectId}`}
          />
        </div>

        {/* Spend summary */}
        <div className="grid gap-4 sm:grid-cols-3">
          <SpendCard label="Reserved" value={spendSummary.reserved} variant="slate" />
          <SpendCard label="Committed" value={spendSummary.committed} variant="cyan" />
          <SpendCard label="Net spend" value={spendSummary.net} variant="emerald" />
        </div>

        {/* Recent traces */}
        <Card>
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <CardTitle>Recent traces</CardTitle>
              <CardDescription>Latest 5 traces across hook connections.</CardDescription>
            </div>
            <Link
              className={cn(buttonVariants({ size: 'sm', variant: 'outline' }))}
              href={`/projects/${projectId}`}
            >
              View hooks
            </Link>
          </CardHeader>
          <CardContent>
            {recentTraces.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead className="text-right">Tokens</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentTraces.map((trace) => (
                    <TableRow key={trace.id}>
                      <TableCell className="font-mono text-xs">
                        <Link
                          className="text-cyan-300 hover:text-cyan-200"
                          href={`/traces/${trace.id}`}
                        >
                          {trace.externalTraceId}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={trace.status} />
                      </TableCell>
                      <TableCell className="text-sm">{trace.provider ?? '—'}</TableCell>
                      <TableCell className="text-sm">{trace.model ?? '—'}</TableCell>
                      <TableCell className="text-right text-sm">
                        {formatNumber(trace.inputTokens)} in / {formatNumber(trace.outputTokens)}{' '}
                        out
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        {formatCurrency(
                          decimalOrNumber(trace.actualCostUsd ?? trace.estimatedCostUsd ?? 0)
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/60 p-6 text-center text-sm text-slate-400">
                No traces found. Start sending requests through a hooked connection to see traces
                here.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

/* ------------------------------------------------------------------ */
// Helpers
/* ------------------------------------------------------------------ */

function MetricCard({
  label,
  value,
  icon: Icon,
  href,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  href: string;
}) {
  return (
    <Link href={href} aria-label={`View ${label.toLowerCase()}`} className="block">
      <Card className="transition-colors hover:border-slate-600">
        <CardContent className="flex items-center justify-between p-5">
          <div className="space-y-1">
            <p className="text-sm text-slate-400">{label}</p>
            <p className="text-3xl font-semibold">{formatNumber(value)}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
            <Icon className="h-5 w-5 text-cyan-300" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function SpendCard({
  label,
  value,
  variant,
}: {
  label: string;
  value: number;
  variant: 'slate' | 'cyan' | 'emerald';
}) {
  const variantClasses =
    variant === 'cyan'
      ? 'border-cyan-900/50 bg-cyan-950/20'
      : variant === 'emerald'
        ? 'border-emerald-900/50 bg-emerald-950/20'
        : 'border-slate-800 bg-slate-900/40';

  return (
    <Card className={variantClasses}>
      <CardContent className="flex flex-col gap-1 p-5">
        <p className="text-sm text-slate-400 flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          {label} (30d)
        </p>
        <p className="text-2xl font-semibold">{formatCurrency(value)}</p>
      </CardContent>
    </Card>
  );
}
