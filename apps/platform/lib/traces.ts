import { Prisma, TraceStatus } from '@prisma/client';

import { prisma } from './db';

export interface ProjectTraceFilters {
  query?: string;
  provider?: string;
  model?: string;
  status?: string;
}

function normalizeFilter(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function normalizeStatus(value: string | undefined): TraceStatus | undefined {
  const normalized = normalizeFilter(value)?.toUpperCase();
  return normalized && Object.values(TraceStatus).includes(normalized as TraceStatus)
    ? (normalized as TraceStatus)
    : undefined;
}

export async function getProjectTraceExplorer(
  projectId: string,
  userId: string,
  filters: ProjectTraceFilters = {}
) {
  const query = normalizeFilter(filters.query);
  const provider = normalizeFilter(filters.provider);
  const model = normalizeFilter(filters.model);
  const status = normalizeStatus(filters.status);

  const authorizationWhere: Prisma.TraceWhereInput = {
    hook: {
      projectId,
      project: {
        members: {
          some: { userId },
        },
      },
    },
  };

  const where: Prisma.TraceWhereInput = {
    ...authorizationWhere,
    ...(provider ? { provider } : {}),
    ...(model ? { model } : {}),
    ...(status ? { status } : {}),
    ...(query
      ? {
          OR: [
            { externalTraceId: { contains: query, mode: 'insensitive' } },
            { requestId: { contains: query, mode: 'insensitive' } },
            { provider: { contains: query, mode: 'insensitive' } },
            { model: { contains: query, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [
    traces,
    totalCount,
    blockedCount,
    failedCount,
    costSummary,
    providerRows,
    modelRows,
  ] = await Promise.all([
    prisma.trace.findMany({
      where,
      include: {
        hook: {
          select: {
            publicId: true,
            name: true,
            environment: true,
          },
        },
      },
      orderBy: [{ startedAt: 'desc' }, { id: 'desc' }],
      take: 100,
    }),
    prisma.trace.count({ where }),
    prisma.trace.count({ where: { ...where, status: TraceStatus.BLOCKED } }),
    prisma.trace.count({ where: { ...where, status: TraceStatus.FAILED } }),
    prisma.trace.aggregate({
      where,
      _sum: {
        actualCostUsd: true,
      },
    }),
    prisma.trace.findMany({
      where: {
        ...authorizationWhere,
        provider: { not: null },
      },
      select: { provider: true },
      distinct: ['provider'],
      orderBy: { provider: 'asc' },
    }),
    prisma.trace.findMany({
      where: {
        ...authorizationWhere,
        model: { not: null },
      },
      select: { model: true },
      distinct: ['model'],
      orderBy: { model: 'asc' },
    }),
  ]);

  return {
    traces,
    summary: {
      totalCount,
      blockedCount,
      failedCount,
      committedUsd: Number(costSummary._sum.actualCostUsd ?? 0),
      visibleCount: traces.length,
      isTruncated: totalCount > traces.length,
    },
    facets: {
      providers: providerRows.flatMap((row) => (row.provider ? [row.provider] : [])),
      models: modelRows.flatMap((row) => (row.model ? [row.model] : [])),
      statuses: Object.values(TraceStatus),
    },
    filters: {
      query,
      provider,
      model,
      status,
    },
  };
}
