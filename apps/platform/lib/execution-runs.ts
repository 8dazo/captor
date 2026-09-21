import { Prisma } from '@prisma/client';
import { prisma } from './db';
import { receiptSchema, receiptStatuses, type Receipt } from './execution-receipts';

export function runAccess(projectId: string, userId: string) {
  return { projectId, project: { members: { some: { userId } } } };
}

export async function listExecutionRuns(
  projectId: string,
  userId: string,
  filters: { q?: string; status?: string; page?: string }
) {
  const pageNumber = Number(filters.page);
  const page =
    Number.isSafeInteger(pageNumber) && pageNumber > 0 ? Math.min(pageNumber, 100000) : 1;
  const q = filters.q?.trim().slice(0, 200) ?? '';
  const status = receiptStatuses.find((value) => value === filters.status);
  const where: Prisma.ExecutionReceiptRecordWhereInput = {
    ...runAccess(projectId, userId),
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { runId: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.executionReceiptRecord.findMany({
      where,
      orderBy: [{ startedAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * 25,
      take: 25,
    }),
    prisma.executionReceiptRecord.count({ where }),
  ]);
  return {
    rows: rows.map((row) => ({ ...row, data: receiptSchema.parse(row.receipt) })),
    total,
    page,
    q,
    status,
  };
}

export async function getExecutionRun(projectId: string, userId: string, id: string) {
  const row = await prisma.executionReceiptRecord.findFirst({
    where: { ...runAccess(projectId, userId), id },
  });
  return row ? { ...row, data: receiptSchema.parse(row.receipt) } : null;
}

export async function importExecutionRuns(projectId: string, userId: string, receipts: Receipt[]) {
  return prisma.$transaction(async (tx) => {
    const project = await tx.project.findFirst({
      where: { id: projectId, members: { some: { userId } } },
      select: { id: true },
    });
    if (!project) return null;
    // Imports are immutable snapshots. Duplicate IDs never overwrite existing evidence.
    return tx.executionReceiptRecord.createMany({
      data: receipts.map((receipt) => ({
        projectId,
        runId: receipt.id,
        name: receipt.name,
        status: receipt.status,
        startedAt: new Date(receipt.startedAt),
        receipt: receipt as Prisma.InputJsonObject,
      })),
      skipDuplicates: true,
    });
  });
}
