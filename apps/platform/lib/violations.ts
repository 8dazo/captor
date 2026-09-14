import { Prisma } from '@prisma/client';

import { prisma } from './db';

export type ProjectViolationFilters = {
  query?: string;
  category?: string;
  eventType?: string;
  provider?: string;
  model?: string;
  hookId?: string;
};

function clean(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

export async function getProjectViolationExplorer(
  projectId: string,
  userId: string,
  filters: ProjectViolationFilters = {}
) {
  const normalized = {
    query: clean(filters.query),
    category: clean(filters.category),
    eventType: clean(filters.eventType),
    provider: clean(filters.provider),
    model: clean(filters.model),
    hookId: clean(filters.hookId),
  };

  const hookScope: Prisma.HookConnectionWhereInput = {
    projectId,
    project: {
      members: {
        some: { userId },
      },
    },
  };

  const projectScope: Prisma.ViolationWhereInput = {
    hook: hookScope,
  };

  const traceFilter: Prisma.TraceWhereInput | undefined =
    normalized.provider || normalized.model
      ? {
          ...(normalized.provider ? { provider: normalized.provider } : {}),
          ...(normalized.model ? { model: normalized.model } : {}),
        }
      : undefined;

  const where: Prisma.ViolationWhereInput = {
    hook: {
      ...hookScope,
      ...(normalized.hookId ? { publicId: normalized.hookId } : {}),
    },
    ...(normalized.category ? { category: normalized.category } : {}),
    ...(normalized.eventType ? { eventType: normalized.eventType } : {}),
    ...(traceFilter ? { trace: traceFilter } : {}),
    ...(normalized.query
      ? {
          OR: [
            { message: { contains: normalized.query, mode: 'insensitive' } },
            { category: { contains: normalized.query, mode: 'insensitive' } },
            { eventType: { contains: normalized.query, mode: 'insensitive' } },
            { hook: { name: { contains: normalized.query, mode: 'insensitive' } } },
            { hook: { publicId: { contains: normalized.query, mode: 'insensitive' } } },
            { trace: { externalTraceId: { contains: normalized.query, mode: 'insensitive' } } },
            { trace: { requestId: { contains: normalized.query, mode: 'insensitive' } } },
            { trace: { provider: { contains: normalized.query, mode: 'insensitive' } } },
            { trace: { model: { contains: normalized.query, mode: 'insensitive' } } },
          ],
        }
      : {}),
  };

  const [
    violations,
    totalCount,
    blockedCount,
    failedCount,
    matchingTraceIds,
    categoryRows,
    eventTypeRows,
    providerRows,
    modelRows,
    hookRows,
  ] = await Promise.all([
    prisma.violation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        hook: {
          select: {
            publicId: true,
            name: true,
            environment: true,
          },
        },
        trace: {
          select: {
            id: true,
            externalTraceId: true,
            requestId: true,
            provider: true,
            model: true,
            status: true,
          },
        },
        llmSession: {
          select: {
            externalSessionId: true,
          },
        },
      },
    }),
    prisma.violation.count({ where }),
    prisma.violation.count({
      where: {
        AND: [where, { eventType: { in: ['request.blocked', 'tool.blocked'] } }],
      },
    }),
    prisma.violation.count({
      where: {
        AND: [where, { eventType: { in: ['request.failed', 'tool.failed'] } }],
      },
    }),
    prisma.violation.findMany({
      where: { AND: [where, { traceId: { not: null } }] },
      select: { traceId: true },
      distinct: ['traceId'],
    }),
    prisma.violation.findMany({
      where: projectScope,
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    }),
    prisma.violation.findMany({
      where: projectScope,
      select: { eventType: true },
      distinct: ['eventType'],
      orderBy: { eventType: 'asc' },
    }),
    prisma.trace.findMany({
      where: {
        hook: hookScope,
        provider: { not: null },
        violations: { some: {} },
      },
      select: { provider: true },
      distinct: ['provider'],
      orderBy: { provider: 'asc' },
    }),
    prisma.trace.findMany({
      where: {
        hook: hookScope,
        model: { not: null },
        violations: { some: {} },
      },
      select: { model: true },
      distinct: ['model'],
      orderBy: { model: 'asc' },
    }),
    prisma.hookConnection.findMany({
      where: {
        ...hookScope,
        violations: { some: {} },
      },
      select: {
        publicId: true,
        name: true,
        environment: true,
      },
      orderBy: [{ environment: 'asc' }, { name: 'asc' }],
    }),
  ]);

  return {
    filters: normalized,
    violations,
    summary: {
      totalCount,
      visibleCount: violations.length,
      blockedCount,
      failedCount,
      affectedTraceCount: matchingTraceIds.length,
      isTruncated: totalCount > violations.length,
    },
    facets: {
      categories: categoryRows.map((row) => row.category),
      eventTypes: eventTypeRows.map((row) => row.eventType),
      providers: providerRows.flatMap((row) => (row.provider ? [row.provider] : [])),
      models: modelRows.flatMap((row) => (row.model ? [row.model] : [])),
      hooks: hookRows,
    },
  };
}
