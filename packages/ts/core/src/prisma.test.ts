import { describe, expect, it, vi } from 'vitest';

import { ContractViolationError, ExecutionRun } from './index.js';
import { createPrismaQueryGuard, UnboundedPrismaWriteError } from './prisma.js';

describe('createPrismaQueryGuard', () => {
  it('reserves and commits one write for single-row mutations', async () => {
    const execution = new ExecutionRun('single-write', {
      limits: { resources: { 'db.writes': 1 } },
    });
    const query = vi.fn(async () => ({ id: 1 }));
    const guard = createPrismaQueryGuard(execution);

    await guard({ model: 'User', operation: 'update', args: { where: { id: 1 } }, query });

    expect(query).toHaveBeenCalledOnce();
    expect(execution.receipt().resources['db.writes']?.committed).toBe(1);
  });

  it('blocks a write before the query when the resource limit is exhausted', async () => {
    const execution = new ExecutionRun('blocked-write', {
      limits: { resources: { 'db.writes': 1 } },
    });
    execution.consume('db.writes');
    const query = vi.fn(async () => ({ id: 2 }));
    const guard = createPrismaQueryGuard(execution);

    await expect(
      guard({ model: 'User', operation: 'create', args: { data: {} }, query }),
    ).rejects.toBeInstanceOf(ContractViolationError);
    expect(query).not.toHaveBeenCalled();
  });

  it('uses createMany input size for a preflight reservation and reconciles actual count', async () => {
    const execution = new ExecutionRun('batch-write', {
      limits: { resources: { 'db.writes': 3 } },
    });
    const query = vi.fn(async () => ({ count: 2 }));
    const guard = createPrismaQueryGuard(execution);

    await guard({
      model: 'User',
      operation: 'createMany',
      args: { data: [{ id: 1 }, { id: 2 }, { id: 3 }] },
      query,
    });

    expect(execution.receipt().resources['db.writes']).toMatchObject({
      committed: 2,
      reserved: 0,
      limit: 3,
    });
  });

  it('fails closed for updateMany/deleteMany because cardinality is unknown before execution', async () => {
    const execution = new ExecutionRun('unbounded-write', {
      limits: { resources: { 'db.writes': 10 } },
    });
    const query = vi.fn(async () => ({ count: 8 }));
    const guard = createPrismaQueryGuard(execution);

    await expect(
      guard({ model: 'User', operation: 'updateMany', args: { data: { active: true } }, query }),
    ).rejects.toBeInstanceOf(UnboundedPrismaWriteError);
    expect(query).not.toHaveBeenCalled();
  });
});
