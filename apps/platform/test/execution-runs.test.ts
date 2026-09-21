import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  project: { findFirst: vi.fn() },
  records: { findFirst: vi.fn(), findMany: vi.fn(), count: vi.fn(), createMany: vi.fn() },
}));
vi.mock('../lib/db', () => ({
  prisma: {
    executionReceiptRecord: mocks.records,
    $transaction: (fn: (tx: unknown) => unknown) =>
      fn({ project: mocks.project, executionReceiptRecord: mocks.records }),
  },
}));

import { getExecutionRun, importExecutionRuns, listExecutionRuns } from '../lib/execution-runs';
import type { Receipt } from '../lib/execution-receipts';

const receipt: Receipt = {
  id: 'run-1',
  name: 'Backfill',
  status: 'running',
  startedAt: '2026-09-21T00:00:00Z',
  resources: {},
  metrics: {},
  checkpoints: {},
  violations: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.records.findMany.mockResolvedValue([]);
  mocks.records.count.mockResolvedValue(0);
});

describe('project-owned execution data', () => {
  it('scopes list and count to the project AND signed-in member, even with search filters', async () => {
    await listExecutionRuns('project-A', 'user-A', { q: 'backfill', status: 'failed', page: '2' });
    const where = {
      projectId: 'project-A',
      project: { members: { some: { userId: 'user-A' } } },
      status: 'failed',
    };
    expect(mocks.records.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining(where), skip: 25, take: 25 })
    );
    expect(mocks.records.count).toHaveBeenCalledWith({ where: expect.objectContaining(where) });
  });
  it('does not look up a receipt by ID alone', async () => {
    mocks.records.findFirst.mockResolvedValue(null);
    expect(await getExecutionRun('project-B', 'user-B', 'private-receipt')).toBeNull();
    expect(mocks.records.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'private-receipt',
        projectId: 'project-B',
        project: { members: { some: { userId: 'user-B' } } },
      },
    });
  });
  it('rejects imports without project membership before writing', async () => {
    mocks.project.findFirst.mockResolvedValue(null);
    expect(await importExecutionRuns('project-B', 'user-A', [receipt])).toBeNull();
    expect(mocks.records.createMany).not.toHaveBeenCalled();
  });
  it('does not overwrite previously imported evidence', async () => {
    mocks.project.findFirst.mockResolvedValue({ id: 'project-A' });
    mocks.records.createMany.mockResolvedValue({ count: 1 });
    expect(await importExecutionRuns('project-A', 'user-A', [receipt])).toEqual({ count: 1 });
    expect(mocks.records.createMany).toHaveBeenCalledWith({
      skipDuplicates: true,
      data: [expect.objectContaining({ projectId: 'project-A', receipt })],
    });
  });
  it('normalizes invalid pages and unsupported statuses', async () => {
    const result = await listExecutionRuns('project-A', 'user-A', {
      page: '-2',
      status: 'COMPLETED',
    });
    expect(result.page).toBe(1);
    expect(result.status).toBeUndefined();
  });
});
