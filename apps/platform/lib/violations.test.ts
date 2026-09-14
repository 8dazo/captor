import { describe, expect, it } from 'vitest';

import { buildProjectViolationWhere } from './violations';

describe('buildProjectViolationWhere', () => {
  it('keeps provider and model filters together', () => {
    const { normalized, where } = buildProjectViolationWhere('project_1', 'user_1', {
      provider: ' openrouter ',
      model: ' openrouter/free ',
    });

    expect(normalized.provider).toBe('openrouter');
    expect(normalized.model).toBe('openrouter/free');
    expect(where.trace).toEqual({
      provider: 'openrouter',
      model: 'openrouter/free',
    });
  });

  it('composes hook, category, and event filters inside the project membership scope', () => {
    const { where } = buildProjectViolationWhere('project_1', 'user_1', {
      hookId: 'hook_prod',
      category: 'access',
      eventType: 'request.blocked',
    });

    expect(where.category).toBe('access');
    expect(where.eventType).toBe('request.blocked');
    expect(where.hook).toEqual({
      projectId: 'project_1',
      project: {
        members: {
          some: { userId: 'user_1' },
        },
      },
      publicId: 'hook_prod',
    });
  });

  it('adds free-text search without dropping structured filters', () => {
    const { where } = buildProjectViolationWhere('project_1', 'user_1', {
      query: ' timeout ',
      provider: 'openrouter',
      eventType: 'request.failed',
    });

    expect(where.eventType).toBe('request.failed');
    expect(where.trace).toEqual({ provider: 'openrouter' });
    expect(where.OR).toEqual(
      expect.arrayContaining([
        { message: { contains: 'timeout', mode: 'insensitive' } },
        { trace: { provider: { contains: 'timeout', mode: 'insensitive' } } },
      ])
    );
  });
});
