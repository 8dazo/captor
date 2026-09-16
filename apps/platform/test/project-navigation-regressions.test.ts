import { describe, expect, it } from 'vitest';

import { getNavigationResource } from '../lib/navigation-context';

describe('project navigation regressions', () => {
  it('keeps project collection routes out of resource lookup', () => {
    expect(getNavigationResource('/projects')).toBeNull();
    expect(getNavigationResource('/projects/project_123')).toBeNull();
    expect(getNavigationResource('/projects/project_123/traces')).toBeNull();
  });

  it('recognizes resource detail routes that need project context restored', () => {
    expect(getNavigationResource('/traces/trace_123')).toEqual({ type: 'trace', id: 'trace_123' });
    expect(getNavigationResource('/hooks/hook_123')).toEqual({ type: 'hook', id: 'hook_123' });
  });
});
