import { Activity, Database, DollarSign, LineChart, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import React from 'react';

import { AppShell } from '../../../../components/app-shell';
import { MetricCard } from '../../../../components/metric-card';
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
            value={formatNumber(metrics.tracesCount)}
            icon={<Activity className="h-4 w-4" />}
            href={`/projects/${projectId}/hooks`}
          />
          <MetricCard
            label="Datasets"
            value={formatNumber(metrics.datasetsCount)}
            icon={<Database className="h-4 w-4" />}
            href={`/projects/${projectId}/datasets`}
          />
          <MetricCard
            label="Eval runs"
            value={formatNumber(metrics.evalRunsCount)}
            icon={<LineChart className="h-4 w-4" />}
            href={`/projects/${projectId}/evals`}
          />
          <MetricCard
            label="Hooks"
            value={formatNumber(metrics.hooksCount)}
            icon={<ShieldCheck className="h-4 w-4" />}
            href={`/projects/${projectId}`}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <MetricCard
            label={'Reserved (30d)'}
            value={formatCurrency(spendSummary.reserved)}
            icon={<DollarSign className="h-4 w-4" />}
          />
          <MetricCard
            label={'Committed (30d)'}
            value={formatCurrency(spendSummary.committed)}
            icon={<DollarSign className="h-4 w-4" />}
            variant="primary"
          />
          <MetricCard
            label={'Net spend (30d)'}
            value={formatCurrency(spendSummary.net)}
            icon={<DollarSign className="h-4 w-4" />}
            variant="success"
          />
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
                        <Badge variant={statusVariant(trace.status)}>{trace.status}</Badge>
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

function statusVariant(
  status: string
): 'status_completed' | 'status_failed' | 'status_blocked' | 'status_pending' {
  if (status === 'COMPLETED') return 'status_completed';
  if (status === 'FAILED') return 'status_failed';
  if (status === 'BLOCKED') return 'status_blocked';
  return 'status_pending';
}
