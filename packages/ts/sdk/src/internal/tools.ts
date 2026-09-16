import type { ToolHandle, TrackToolOptions } from "@captar/types";

import type { BudgetReconciliation } from "./budget-engine.js";
import { ToolApprovalRequiredError } from "./errors.js";
import { restrictPolicy } from "./policy-compiler.js";
import type { PolicyEngine } from "./policy-engine.js";
import type { RuntimeSession } from "./session.js";
import { createSpanSnapshot, updateSpanSnapshot } from "./span.js";

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
    "spend.committed",
    {
      provider: "tool",
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
    "guardrail.violation",
    {
      category: "spend",
      message:
        reconciliation.hardBudgetOverrunUsd > 0
          ? `Tool \"${name}\" exceeded the hard session budget by $${reconciliation.hardBudgetOverrunUsd.toFixed(6)}.`
          : `Tool \"${name}\" exceeded its reserved cost by $${reconciliation.reservationOverrunUsd.toFixed(6)}.`,
      provider: "tool",
      model: name,
      reservationOverrunUsd: reconciliation.reservationOverrunUsd,
      hardBudgetOverrunUsd: reconciliation.hardBudgetOverrunUsd,
    },
    eventOptions,
  );
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
        kind: "tool",
        attributes: {
          toolName: name,
        },
      });
      const toolPolicy = restrictPolicy(
        session.policy?.tool ? { tool: session.policy.tool } : undefined,
        options.policy ? { tool: options.policy } : undefined,
      )?.tool;

      try {
        policyEngine.evaluateTool(name, toolPolicy);
      } catch (error) {
        const blockedSpan = updateSpanSnapshot(toolSpan, {
          status: "blocked",
          endedAt: new Date().toISOString(),
          attributes: {
            reason: error instanceof Error ? error.message : "blocked",
          },
        });
        await session.emit(
          "tool.blocked",
          {
            name,
            reason: error instanceof Error ? error.message : "blocked",
          },
          {
            spanId: toolSpan.id,
            parentSpanId: toolSpan.parentId,
            span: blockedSpan,
          },
        );
        throw error;
      }

      const requiresApproval = toolPolicy?.requireApprovalFor?.includes(name);

      if (requiresApproval) {
        const approved =
          typeof options.approval === "function"
            ? await options.approval({
                sessionId: session.id,
                name,
                args: options.args as TArgs,
              })
            : options.approval;

        if (!approved) {
          const blockedSpan = updateSpanSnapshot(toolSpan, {
            status: "blocked",
            endedAt: new Date().toISOString(),
            attributes: {
              reason: `Tool \"${name}\" requires explicit approval.`,
            },
          });
          await session.emit(
            "tool.blocked",
            {
              name,
              reason: `Tool \"${name}\" requires explicit approval.`,
            },
            {
              spanId: toolSpan.id,
              parentSpanId: toolSpan.parentId,
              span: blockedSpan,
            },
          );
          throw new ToolApprovalRequiredError(
            `Tool \"${name}\" requires explicit approval.`,
          );
        }
      }

      session.markToolCall();

      const estimatedCostUsd =
        typeof options.estimate === "function"
          ? await options.estimate({
              sessionId: session.id,
              name,
              args: options.args as TArgs,
            })
          : options.estimate ?? 0;

      let reservedUsd = 0;

      try {
        reservedUsd = session.reserve(estimatedCostUsd, {
          label: name,
        });
        await session.emit(
          "estimate.reserved",
          {
            provider: "tool",
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
          "tool.started",
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

        const result = await work();
        const actualCostUsd =
          typeof options.actual === "function"
            ? await options.actual({
                sessionId: session.id,
                name,
                result,
              })
            : options.actual ?? estimatedCostUsd;

        const reconciliation = session.commit(reservedUsd, actualCostUsd);
        reservedUsd = 0;
        const completedSpan = updateSpanSnapshot(toolSpan, {
          status: "completed",
          endedAt: new Date().toISOString(),
          attributes: {
            estimatedCostUsd,
            actualCostUsd,
          },
        });
        await session.emit(
          "tool.completed",
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
        const failedSpan = updateSpanSnapshot(toolSpan, {
          status: "failed",
          endedAt: new Date().toISOString(),
          attributes: {
            error: error instanceof Error ? error.message : "tool failed",
          },
        });

        if (reservedUsd > 0) {
          const reconciliation = session.commit(reservedUsd, 0);
          reservedUsd = 0;
          await emitToolSpend(session, name, reconciliation, failedSpan);
        }

        await session.emit(
          "tool.failed",
          {
            name,
            reason: error instanceof Error ? error.message : "tool failed",
          },
          {
            spanId: toolSpan.id,
            parentSpanId: toolSpan.parentId,
            span: failedSpan,
          },
        );
        throw error;
      }
    },
  };
}
