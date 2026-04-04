import type {
  CallPolicy,
  GuardrailCategory,
  SessionPolicy,
  ToolPolicy,
} from "@captar/types";
import { fingerprintRequest, RepetitionTracker, resolveRetryCount } from "@captar/utils";

import { PolicyViolationError } from "./errors.js";

export interface GuardrailViolation {
  category: GuardrailCategory;
  message: string;
}

export class PolicyEngine {
  private readonly repetitionTracker = new RepetitionTracker();
  private readonly toolCalls = new Map<string, number>();

  evaluateCall(
    request: Record<string, unknown>,
    policy?: SessionPolicy,
    estimatedCostUsd?: number,
  ): void {
    const callPolicy = policy?.call;
    const budgetPolicy = policy?.budget;
    const model = typeof request.model === "string" ? request.model : undefined;

    this.assertCallPolicy(callPolicy, request, model, estimatedCostUsd);

    if (budgetPolicy?.maxRepeatedCalls) {
      const fingerprint = fingerprintRequest({
        model,
        input: request.input ?? request.messages,
      });
      const count = this.repetitionTracker.record(fingerprint);
      if (count > budgetPolicy.maxRepeatedCalls) {
        throw new PolicyViolationError(
          `Blocked repeated call fingerprint after ${count} matching requests.`,
        );
      }
    }
  }

  evaluateTool(name: string, policy?: ToolPolicy): void {
    if (policy?.allowedTools && !policy.allowedTools.includes(name)) {
      throw new PolicyViolationError(`Tool "${name}" is not in the allow list.`);
    }

    if (policy?.blockedTools?.includes(name)) {
      throw new PolicyViolationError(`Tool "${name}" is blocked by policy.`);
    }

    const currentCount = (this.toolCalls.get(name) ?? 0) + 1;
    this.toolCalls.set(name, currentCount);

    if (policy?.maxCallsPerSession && currentCount > policy.maxCallsPerSession) {
      throw new PolicyViolationError(
        `Tool "${name}" exceeded maxCallsPerSession=${policy.maxCallsPerSession}.`,
      );
    }
  }

  private assertCallPolicy(
    policy: CallPolicy | undefined,
    request: Record<string, unknown>,
    model: string | undefined,
    estimatedCostUsd?: number,
  ): void {
    if (!policy) {
      return;
    }

    if (model && policy.allowedModels && !policy.allowedModels.includes(model)) {
      throw new PolicyViolationError(`Model "${model}" is not in the allow list.`);
    }

    if (model && policy.blockedModels?.includes(model)) {
      throw new PolicyViolationError(`Model "${model}" is blocked by policy.`);
    }

    if (
      typeof estimatedCostUsd === "number" &&
      typeof policy.maxEstimatedCostUsd === "number" &&
      estimatedCostUsd > policy.maxEstimatedCostUsd
    ) {
      throw new PolicyViolationError(
        `Estimated cost $${estimatedCostUsd.toFixed(4)} exceeds maxEstimatedCostUsd.`,
      );
    }

    if (
      typeof policy.maxOutputTokens === "number" &&
      typeof request.max_output_tokens === "number" &&
      request.max_output_tokens > policy.maxOutputTokens
    ) {
      throw new PolicyViolationError(
        `max_output_tokens exceeds policy limit ${policy.maxOutputTokens}.`,
      );
    }

    const retryCount = resolveRetryCount(request);
    if (
      typeof policy.retriesCeiling === "number" &&
      retryCount > policy.retriesCeiling
    ) {
      throw new PolicyViolationError(
        `Retry count ${retryCount} exceeds retriesCeiling=${policy.retriesCeiling}.`,
      );
    }
  }
}
