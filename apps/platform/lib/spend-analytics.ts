import { Prisma } from '@prisma/client';

import { prisma } from './db';

export interface SpendBreakdownRow {
  label: string;
  filterValue?: string;
  traceCount: number;
  actualCostUsd: number;
  share: number;
}

function decimalToNumber(value: Prisma.Decimal | number | null | undefined) {
  if (value == null) return 0;
  return typeof value === 'number' ? value : Number(value);
}

function normalizeRows(
  rows: Array<{
    key: string | null;
    traceCount: number;
    actualCostUsd: number;
  }>
): SpendBreakdownRow[] {
  const totalCost = rows.reduce((total, row) => total + row.actualCostUsd, 0);

  return rows
    .map((row) => ({
      label: row.key ?? 'unknown',
      filterValue: row.key ?? undefined,
      traceCount: row.traceCount,
      actualCostUsd: row.actualCostUsd,
      share: totalCost > 0 ? row.actualCostUsd / totalCost : 0,
    }))
    .sort((left, right) => {
      if (right.actualCostUsd !== left.actualCostUsd) {
        return right.actualCostUsd - left.actualCostUsd;
      }
      if (right.traceCount !== left.traceCount) {
        return right.traceCount - left.traceCount;
      }
      return left.label.localeCompare(right.label);
    })
    .slice(0, 5);
}

export async function getProjectSpendBreakdowns(projectId: string, days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const where: Prisma.TraceWhereInput = {
    hook: { projectId },
    startedAt: { gte: since },
  };

  const [providerGroups, modelGroups] = await Promise.all([
    prisma.trace.groupBy({
      by: ['provider'],
      where,
      _count: { _all: true },
      _sum: { actualCostUsd: true },
    }),
    prisma.trace.groupBy({
      by: ['model'],
      where,
      _count: { _all: true },
      _sum: { actualCostUsd: true },
    }),
  ]);

  return {
    days,
    providers: normalizeRows(
      providerGroups.map((row) => ({
        key: row.provider,
        traceCount: row._count._all,
        actualCostUsd: decimalToNumber(row._sum.actualCostUsd),
      }))
    ),
    models: normalizeRows(
      modelGroups.map((row) => ({
        key: row.model,
        traceCount: row._count._all,
        actualCostUsd: decimalToNumber(row._sum.actualCostUsd),
      }))
    ),
  };
}
