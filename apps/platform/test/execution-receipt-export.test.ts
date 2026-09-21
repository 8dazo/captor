import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ auth: vi.fn(), get: vi.fn() }));
vi.mock('../auth', () => ({ auth: mocks.auth }));
vi.mock('../lib/execution-runs', () => ({ getExecutionRun: mocks.get }));
import { GET } from '../app/api/projects/[projectId]/runs/[runId]/receipt/route';
const context = { params: Promise.resolve({ projectId: 'p', runId: 'r' }) };
beforeEach(() => vi.clearAllMocks());

it('requires sign-in before reading receipt data', async () => {
  mocks.auth.mockResolvedValue(null);
  expect((await GET(new Request('http://localhost'), context)).status).toBe(401);
  expect(mocks.get).not.toHaveBeenCalled();
});
it('returns 404 for an inaccessible receipt', async () => {
  mocks.auth.mockResolvedValue({ user: { id: 'u' } });
  mocks.get.mockResolvedValue(null);
  expect((await GET(new Request('http://localhost'), context)).status).toBe(404);
  expect(mocks.get).toHaveBeenCalledWith('p', 'u', 'r');
});
it('downloads only the receipt with private no-store caching', async () => {
  mocks.auth.mockResolvedValue({ user: { id: 'u' } });
  mocks.get.mockResolvedValue({ data: { id: 'sdk-run' }, projectId: 'p' });
  const response = await GET(new Request('http://localhost'), context);
  expect(await response.json()).toEqual({ id: 'sdk-run' });
  expect(response.headers.get('cache-control')).toBe('private, no-store');
  expect(response.headers.get('content-disposition')).toContain('attachment');
});
