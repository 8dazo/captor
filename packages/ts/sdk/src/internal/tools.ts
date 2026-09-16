import type { ToolHandle, TrackToolOptions } from '@captar/types';

import type { BudgetReconciliation } from './budget-engine.js';
import {
  BudgetExceededError,
  PolicyViolationError,
  ToolApprovalRequiredError,
} from './errors.js';
import { restrictPolicy } from './policy-compiler.js';
import type { PolicyEngine } from './policy-engine.js';
import type { RuntimeSession } from './session.js';
import { createSpanSnapshot, updateSpanSnapshot } from './span.js';

type ToolStage =
  | 'policy'
  | 'approval'
  | 'estimate'
  | 'reserve'
  | 'work'
  | 'actual'
  | 'reconcile';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'tool failed';
}

function isBlockedToolError(error: unknown): boolean {
  return (
    error instanceof BudgetExceededError ||
    error instanceof PolicyViolationError ||
    error instanceof ToolApprovalRequiredError
  );
}

async function emitToolSpend(
  session: RuntimeSession,
  name: string,
  reconciliation: BudgetReconciliation,
  span: ReturnType<typeof createSpanSnapshot>,
): Promise<void> {
  const eventOptions = {
    spanId: span.id,
    parentSpanId: span.parentId,
    span,
  };

  await session.emit(
    'spend.committed',
    {
      provider: 'tool',
      model: name,
      actualCostUsd: reconciliation.actualUsd,
      releasedUsd: reconciliation.releasedUsd,
      reservationOverrunUsd: reconciliation.reservationOverrunUsd,
      hardBudgetOverrunUsd: reconciliation.hardBudgetOverrunUsd,
    },
    eventOptions,
  );

  if (reconciliation.reservationOverrunUsd <= 0 && reconciliation.hardBudgetOverrunUsd <= 0) {
    return;
  }

  await session.emit(
    'guardrail.violation',
    {
      category: 'spend',
      message:
        reconciliation.hardBudgetOverrunUsd > 0
          ? `Tool "${name}" exceeded the hard session budget by $${reconciliation.hardBudgetOverrunUsd.toFixed(6)}.`
          : `Tool "${name}" exceeded its reserved cost by $${reconciliation.reservationOverrunUsd.toFixed(6)}.`,
      provider: 'tool',
      model: name,
      reservationOverrunUsd: reconciliation.reservationOverrunUsd,
      hardBudgetOverrunUsd: reconciliation.hardBudgetOverrunUsd,
    },
    eventOptions,
  );
}

function notifyBlockedTool(
  session: RuntimeSession,
  error: unknown,
  estimatedCostUsd: number,
): void {
  if (error instanceof BudgetExceededError) {
    session.notifyBudgetExceeded(estimatedCostUsd);
    return;
  }

  if (error instanceof PolicyViolationError || error instanceof ToolApprovalRequiredError) {
    session.notifyPolicyViolation(error.message, 'blocked');
  }
}

export function createTrackedTool<TArgs, TResult>(
  name: string,
  options: TrackToolOptions<TArgs, TResult>,
  policyEngine: PolicyEngine,
): ToolHandle<TResult> {
  const session = options.session as RuntimeSession;

  return {
    async run(work: () => Promise<TResult>): Promise<TResult> {
      const toolSpan = createSpanSnapshot({
        parentId: session.trace.spanId,
        name,
        kind: 'tool',
        attributes: {
          toolName: name,
        },
      });
      const toolPolicy = restrictPolicy(
        session.policy?.tool ? { tool: session.policy.tool } : undefined,
        options.policy ? { tool: options.policy } : undefined,
      )?.tool;

      let stage: ToolStage = 'policy';
      let estimatedCostUsd = 0;
      let reservedUsd = 0;
      let rollbackAdmission: (() => void) | undefined;

      try {
        // Static policy and already-exhausted capacity are rejected before any
        // user-supplied approval/estimate callback runs.
        policyEngine.assertToolPolicy(name, toolPolicy);

        stage = 'approval';
        const requiresApproval = toolPolicy?.requireApprovalFor?.includes(name);
        if (requiresApproval) {
          const approved =
            typeof options.approval === 'function'
              ? await options.approval({
                  sessionId: session.id,
                  name,
                  args: options.args as TArgs,
                })
              : options.approval;

          if (!approved) {
            throw new ToolApprovalRequiredError(
              `Tool "${name}" requires explicit approval.`,
            );
          }
        }

        stage = 'estimate';
        estimatedCostUsd =
          typeof options.estimate === 'function'
            ? await options.estimate({
                sessionId: session.id,
                name,
                args: options.args as TArgs,
              })
            : options.estimate ?? 0;

        // Recheck and consume the session-scoped tool quota immediately before
        // budget admission. If budget reservation rejects, roll the quota back so
        // blocked preflight attempts do not consume maxCallsPerSession.
        stage = 'reserve';
        rollbackAdmission = policyEngine.admitTool(name, toolPolicy);
        try {
          reservedUsd = session.reserve(estimatedCostUsd, {
            label: name,
          });
        } catch (error) {
          rollbackAdmission();
          rollbackAdmission = undefined;
          throw error;
        }
        rollbackAdmission = undefined;
        session.markToolCall();

        await session.emit(
          'estimate.reserved',
          {
            provider: 'tool',
            model: name,
            reservedUsd,
          },
          {
            spanId: toolSpan.id,
            parentSpanId: toolSpan.parentId,
            span: toolSpan,
          },
        );
        await session.emit(
          'tool.started',
          {
            name,
            estimatedCostUsd,
          },
          {
            spanId: toolSpan.id,
            parentSpanId: toolSpan.parentId,
            span: toolSpan,
          },
        );

        stage = 'work';
        const result = await work();

        stage = 'actual';
        const actualCostUsd =
          typeof options.actual === 'function'
            ? await options.actual({
                sessionId: session.id,
                name,
                result,
              })
            : options.actual ?? estimatedCostUsd;

        stage = 'reconcile';
        const reconciliation = session.commit(reservedUsd, actualCostUsd);
        reservedUsd = 0;
        const completedSpan = updateSpanSnapshot(toolSpan, {
          status: 'completed',
          endedAt: new Date().toISOString(),
          attributes: {
            estimatedCostUsd,
            actualCostUsd,
          },
        });
        await session.emit(
          'tool.completed',
          {
            name,
            actualCostUsd: reconciliation.actualUsd,
            releasedUsd: reconciliation.releasedUsd,
          },
          {
            spanId: toolSpan.id,
            parentSpanId: toolSpan.parentId,
            span: completedSpan,
          },
        );
        await emitToolSpend(session, name, reconciliation, completedSpan);

        return result;
      } catch (error) {
        rollbackAdmission?.();
        rollbackAdmission = undefined;

        const blocked = isBlockedToolError(error);
        const reason = errorMessage(error);
        const terminalSpan = updateSpanSnapshot(toolSpan, {
          status: blocked ? 'blocked' : 'failed',
          endedAt: new Date().toISOString(),
          attributes: {
            reason,
            stage,
          },
        });

        if (reservedUsd > 0) {
          const reconciliation = session.commit(reservedUsd, 0);
          reservedUsd = 0;
          await emitToolSpend(session, name, reconciliation, terminalSpan);
        }

        if (blocked) {
          await session.emit(
            'tool.blocked',
            {
              name,
              reason,
              stage,
              category:
                error instanceof BudgetExceededError
                  ? 'budget'
                  : error instanceof ToolApprovalRequiredError
                    ? 'approval'
                    : 'policy',
              ...(error instanceof BudgetExceededError
                ? {
                    attemptedUsd: estimatedCostUsd,
                    budgetUsd:
                      session.budget.maxSpendUsd ?? session.getSummary().totalReservedUsd,
                  }
                : {}),
            },
            {
              spanId: toolSpan.id,
              parentSpanId: toolSpan.parentId,
              span: terminalSpan,
            },
          );
          notifyBlockedTool(session, error, estimatedCostUsd);
        } else {
          await session.emit(
            'tool.failed',
            {
              name,
              reason,
              stage,
            },
            {
              spanId: toolSpan.id,
              parentSpanId: toolSpan.parentId,
              span: terminalSpan,
            },
          );
        }

        throw error;
      }
    },
  };
}
