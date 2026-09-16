import { describe, expect, it } from 'vitest';

import { getNavigationResource } from '../lib/navigation-context';

describe('getNavigationResource', () => {
  it('resolves trace detail routes', () => {
    expect(getNavigationResource('/traces/trace_123')).toEqual({ type: 'trace', id: 'trace_123' });
  });

  it('resolves hook detail routes', () => {
    expect(getNavigationResource('/hooks/hook_dev')).toEqual({ type: 'hook', id: 'hook_dev' });
  });

  it('decodes resource ids', () => {
    expect(getNavigationResource('/traces/trace%2Fencoded')).toEqual({
      type: 'trace',
      id: 'trace/encoded',
    });
  });

  it('fails closed for malformed encoded ids', () => {
    expect(getNavigationResource('/traces/%E0%A4%A')).toBeNull();
  });

  it('ignores project routes and collection routes', () => {
    expect(getNavigationResource('/projects/project_123/traces')).toBeNull();
    expect(getNavigationResource('/traces')).toBeNull();
    expect(getNavigationResource('/hooks')).toBeNull();
  });
});
