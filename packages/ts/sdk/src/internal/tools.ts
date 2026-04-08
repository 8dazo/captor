import type { ToolHandle, TrackToolOptions } from "@captar/types";

import { ToolApprovalRequiredError } from "./errors.js";
import type { RuntimeSession } from "./session.js";
import { createSpanSnapshot, updateSpanSnapshot } from "./span.js";
import type { PolicyEngine } from "./policy-engine.js";

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
      const toolPolicy = {
        ...session.policy?.tool,
        ...options.policy,
      };

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

      const requiresApproval =
        options.policy?.requireApprovalFor?.includes(name) ||
        session.policy?.tool?.requireApprovalFor?.includes(name);

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
              reason: `Tool "${name}" requires explicit approval.`,
            },
          });
          await session.emit(
            "tool.blocked",
            {
              name,
              reason: `Tool "${name}" requires explicit approval.`,
            },
            {
              spanId: toolSpan.id,
              parentSpanId: toolSpan.parentId,
              span: blockedSpan,
            },
          );
          throw new ToolApprovalRequiredError(
            `Tool "${name}" requires explicit approval.`,
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
        await session.emit(
          "spend.committed",
          {
            provider: "tool",
            model: name,
            actualCostUsd: reconciliation.actualUsd,
            releasedUsd: reconciliation.releasedUsd,
          },
          {
            spanId: toolSpan.id,
            parentSpanId: toolSpan.parentId,
            span: completedSpan,
          },
        );

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
          await session.emit(
            "spend.committed",
            {
              provider: "tool",
              model: name,
              actualCostUsd: reconciliation.actualUsd,
              releasedUsd: reconciliation.releasedUsd,
            },
            {
              spanId: toolSpan.id,
              parentSpanId: toolSpan.parentId,
              span: failedSpan,
            },
          );
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
