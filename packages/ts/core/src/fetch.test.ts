import { describe, expect, it, vi } from 'vitest';

import { ContractViolationError, ExecutionRun } from './index.js';
import { boundedFetch } from './fetch.js';

describe('boundedFetch', () => {
  it('reserves and commits an HTTP request automatically', async () => {
    const run = new ExecutionRun('sync', {
      limits: { resources: { 'http.requests': 2 } },
    });
    const fetchImpl = vi.fn(async () => new Response('ok', { status: 200 }));
    const fetch = boundedFetch(run, { fetch: fetchImpl as typeof globalThis.fetch });

    await fetch('https://example.test/one');

    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(run.receipt().resources['http.requests']).toEqual({
      limit: 2,
      committed: 1,
      reserved: 0,
    });
  });

  it('blocks the next request before the underlying fetch runs', async () => {
    const run = new ExecutionRun('sync', {
      limits: { resources: { 'http.requests': 1 } },
    });
    const fetchImpl = vi.fn(async () => new Response('ok'));
    const fetch = boundedFetch(run, { fetch: fetchImpl as typeof globalThis.fetch });

    await fetch('https://example.test/one');

    await expect(fetch('https://example.test/two')).rejects.toBeInstanceOf(ContractViolationError);
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it('commits attempted requests even when fetch fails', async () => {
    const run = new ExecutionRun('sync', {
      limits: { resources: { 'http.requests': 2 } },
    });
    const fetchImpl = vi.fn(async () => {
      throw new Error('network down');
    });
    const fetch = boundedFetch(run, { fetch: fetchImpl as typeof globalThis.fetch });

    await expect(fetch('https://example.test/fail')).rejects.toThrow('network down');
    expect(run.receipt().resources['http.requests']?.committed).toBe(1);
    expect(run.receipt().resources['http.requests']?.reserved).toBe(0);
  });
});
