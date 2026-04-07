import type { ToolHandle, TrackToolOptions } from "@captar/types";

import { ToolApprovalRequiredError } from "./errors.js";
import type { RuntimeSession } from "./session.js";
import type { PolicyEngine } from "./policy-engine.js";

export function createTrackedTool<TArgs, TResult>(
  name: string,
  options: TrackToolOptions<TArgs, TResult>,
  policyEngine: PolicyEngine,
): ToolHandle<TResult> {
  const session = options.session as RuntimeSession;

  return {
    async run(work: () => Promise<TResult>): Promise<TResult> {
      policyEngine.evaluateTool(name, {
        ...session.policy?.tool,
        ...options.policy,
      });
      session.markToolCall();

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
          throw new ToolApprovalRequiredError(
            `Tool "${name}" requires explicit approval.`,
          );
        }
      }

      const estimatedCostUsd =
        typeof options.estimate === "function"
          ? await options.estimate({
              sessionId: session.id,
              name,
              args: options.args as TArgs,
            })
          : options.estimate ?? 0;

      const reservedUsd = session.reserve(estimatedCostUsd, {
        label: name,
      });
      await session.emit("tool.started", {
        name,
        estimatedCostUsd,
      });

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
      await session.emit("tool.completed", {
        name,
        actualCostUsd: reconciliation.actualUsd,
        releasedUsd: reconciliation.releasedUsd,
      });

      return result;
    },
  };
}
