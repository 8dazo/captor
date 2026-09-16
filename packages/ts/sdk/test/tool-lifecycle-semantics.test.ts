import { describe, expect, it, vi } from 'vitest';

import { createCaptar, type CaptarEvent } from '../src/index.js';

function terminalToolEvents(events: CaptarEvent[]) {
  return events.filter((event) =>
    ['tool.blocked', 'tool.failed', 'tool.completed'].includes(event.type),
  );
}

describe('tracked-tool lifecycle semantics', () => {
  it('uses the global policy callback and emits exactly one blocked terminal event', async () => {
    const onPolicyViolation = vi.fn();
    const captar = createCaptar({ project: 'tool-policy-callback', onPolicyViolation });
    const events: CaptarEvent[] = [];
    captar.onEvent((event) => events.push(event));
    const session = await captar.startSession({
      budget: { maxSpendUsd: 1 },
      policy: { tool: { blockedTools: ['dangerous.tool'] } },
    });
    const work = vi.fn(async () => 'should-not-run');
    const tool = captar.trackTool('dangerous.tool', { session });

    await expect(tool.run(work)).rejects.toThrow(/blocked by policy/i);

    expect(work).not.toHaveBeenCalled();
    expect(onPolicyViolation).toHaveBeenCalledOnce();
    expect(onPolicyViolation).toHaveBeenCalledWith({
      sessionId: session.id,
      reason: expect.stringContaining('dangerous.tool'),
      type: 'blocked',
    });
    expect(session.getSummary().toolCallCount).toBe(0);
    expect(terminalToolEvents(events)).toHaveLength(1);
    expect(terminalToolEvents(events)[0]?.type).toBe('tool.blocked');
    expect(terminalToolEvents(events)[0]?.span?.status).toBe('blocked');
  });

  it('classifies budget rejection as blocked, not failed, and rolls back tool quota', async () => {
    const onBudgetExceeded = vi.fn();
    const captar = createCaptar({ project: 'tool-budget-callback', onBudgetExceeded });
    const events: CaptarEvent[] = [];
    captar.onEvent((event) => events.push(event));
    const session = await captar.startSession({
      budget: { maxSpendUsd: 0.1 },
      policy: { tool: { maxCallsPerSession: 1 } },
    });
    const blockedWork = vi.fn(async () => 'blocked');
    const blocked = captar.trackTool('search.expensive', {
      session,
      estimate: 0.2,
    });

    await expect(blocked.run(blockedWork)).rejects.toThrow(/remaining budget|reserve/i);

    expect(blockedWork).not.toHaveBeenCalled();
    expect(onBudgetExceeded).toHaveBeenCalledOnce();
    expect(onBudgetExceeded).toHaveBeenCalledWith({
      sessionId: session.id,
      budgetUsd: 0.1,
      attemptedUsd: 0.2,
    });
    expect(session.getSummary().toolCallCount).toBe(0);
    const blockedEvent = events.find((event) => event.type === 'tool.blocked');
    expect(blockedEvent?.data).toEqual(
      expect.objectContaining({ category: 'budget', stage: 'reserve', attemptedUsd: 0.2 }),
    );
    expect(events.some((event) => event.type === 'tool.failed')).toBe(false);

    const admittedWork = vi.fn(async () => 'ok');
    const admitted = captar.trackTool('search.cheap', {
      session,
      estimate: 0,
      actual: 0,
    });
    await expect(admitted.run(admittedWork)).resolves.toBe('ok');
    expect(admittedWork).toHaveBeenCalledOnce();
    expect(session.getSummary().toolCallCount).toBe(1);
  });

  it('turns approval callback exceptions into one failed terminal event without admission', async () => {
    const captar = createCaptar({ project: 'tool-approval-failure' });
    const events: CaptarEvent[] = [];
    captar.onEvent((event) => events.push(event));
    const session = await captar.startSession({
      budget: { maxSpendUsd: 1 },
      policy: { tool: { requireApprovalFor: ['write.ticket'] } },
    });
    const work = vi.fn(async () => 'should-not-run');
    const tool = captar.trackTool('write.ticket', {
      session,
      approval: async () => {
        throw new Error('approval service unavailable');
      },
    });

    await expect(tool.run(work)).rejects.toThrow(/approval service unavailable/);

    expect(work).not.toHaveBeenCalled();
    expect(session.getSummary().toolCallCount).toBe(0);
    expect(terminalToolEvents(events)).toHaveLength(1);
    expect(terminalToolEvents(events)[0]?.type).toBe('tool.failed');
    expect(terminalToolEvents(events)[0]?.data).toEqual(
      expect.objectContaining({ stage: 'approval' }),
    );
  });

  it('turns estimate callback exceptions into one failed terminal event without admission', async () => {
    const captar = createCaptar({ project: 'tool-estimate-failure' });
    const events: CaptarEvent[] = [];
    captar.onEvent((event) => events.push(event));
    const session = await captar.startSession({ budget: { maxSpendUsd: 1 } });
    const work = vi.fn(async () => 'should-not-run');
    const tool = captar.trackTool('search.docs', {
      session,
      estimate: async () => {
        throw new Error('estimate unavailable');
      },
    });

    await expect(tool.run(work)).rejects.toThrow(/estimate unavailable/);

    expect(work).not.toHaveBeenCalled();
    expect(session.getSummary().toolCallCount).toBe(0);
    expect(terminalToolEvents(events)).toHaveLength(1);
    expect(terminalToolEvents(events)[0]?.type).toBe('tool.failed');
    expect(terminalToolEvents(events)[0]?.data).toEqual(
      expect.objectContaining({ stage: 'estimate' }),
    );
  });

  it('emits one failed terminal event when actual-cost calculation throws after admitted work', async () => {
    const captar = createCaptar({ project: 'tool-actual-failure' });
    const events: CaptarEvent[] = [];
    captar.onEvent((event) => events.push(event));
    const session = await captar.startSession({ budget: { maxSpendUsd: 1 } });
    const work = vi.fn(async () => 'result');
    const tool = captar.trackTool('search.docs', {
      session,
      estimate: 0.25,
      actual: async () => {
        throw new Error('actual accounting failed');
      },
    });

    await expect(tool.run(work)).rejects.toThrow(/actual accounting failed/);

    expect(work).toHaveBeenCalledOnce();
    expect(session.getSummary().toolCallCount).toBe(1);
    expect(session.getState().reservedUsd).toBe(0);
    expect(session.getSummary().totalCommittedUsd).toBe(0);
    expect(terminalToolEvents(events)).toHaveLength(1);
    expect(terminalToolEvents(events)[0]?.type).toBe('tool.failed');
    expect(terminalToolEvents(events)[0]?.data).toEqual(
      expect.objectContaining({ stage: 'actual' }),
    );
  });

  it('isolates guardrail callback exceptions from the original blocked error', async () => {
    const onPolicyViolation = vi.fn(() => {
      throw new Error('observer crashed');
    });
    const captar = createCaptar({ project: 'tool-callback-isolation', onPolicyViolation });
    const events: CaptarEvent[] = [];
    captar.onEvent((event) => events.push(event));
    const session = await captar.startSession({
      budget: { maxSpendUsd: 1 },
      policy: { tool: { blockedTools: ['blocked.tool'] } },
    });
    const tool = captar.trackTool('blocked.tool', { session });

    await expect(tool.run(async () => 'nope')).rejects.toThrow(/blocked by policy/i);

    expect(onPolicyViolation).toHaveBeenCalledOnce();
    expect(terminalToolEvents(events)).toHaveLength(1);
    expect(terminalToolEvents(events)[0]?.type).toBe('tool.blocked');
  });
});
