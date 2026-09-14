import { describe, expect, it } from 'vitest';

import { getTraceProblemSpans } from './trace-spans';

function span(overrides: Partial<Parameters<typeof getTraceProblemSpans>[0][number]> = {}) {
  return {
    externalSpanId: 'span_default',
    externalParentSpanId: null,
    name: 'request.create',
    kind: 'REQUEST',
    status: 'COMPLETED',
    startedAt: new Date('2026-09-14T10:00:00.000Z'),
    endedAt: new Date('2026-09-14T10:00:01.000Z'),
    attributes: {},
    ...overrides,
  };
}

describe('getTraceProblemSpans', () => {
  it('returns only failed and blocked spans in chronological order', () => {
    const problems = getTraceProblemSpans([
      span({
        externalSpanId: 'failed-later',
        status: 'FAILED',
        startedAt: new Date('2026-09-14T10:00:03.000Z'),
      }),
      span({ externalSpanId: 'ok' }),
      span({
        externalSpanId: 'blocked-first',
        status: 'BLOCKED',
        startedAt: new Date('2026-09-14T10:00:02.000Z'),
      }),
    ]);

    expect(problems.map((problem) => problem.externalSpanId)).toEqual([
      'blocked-first',
      'failed-later',
    ]);
  });

  it('extracts diagnostic attributes and duration', () => {
    const [problem] = getTraceProblemSpans([
      span({
        status: 'FAILED',
        startedAt: new Date('2026-09-14T10:00:00.000Z'),
        endedAt: new Date('2026-09-14T10:00:00.250Z'),
        attributes: {
          error: 'upstream timeout',
          provider: 'openrouter',
          model: 'openrouter/free',
        },
      }),
    ]);

    expect(problem).toMatchObject({
      error: 'upstream timeout',
      provider: 'openrouter',
      model: 'openrouter/free',
      durationMs: 250,
    });
  });

  it('falls back from error to reason/message attributes', () => {
    const [problem] = getTraceProblemSpans([
      span({
        status: 'BLOCKED',
        attributes: { reason: 'budget exceeded' },
      }),
    ]);

    expect(problem?.error).toBe('budget exceeded');
  });

  it('keeps completed and running spans out of the problem view', () => {
    expect(
      getTraceProblemSpans([
        span({ status: 'COMPLETED' }),
        span({ externalSpanId: 'running', status: 'RUNNING', endedAt: null }),
      ])
    ).toEqual([]);
  });
});
