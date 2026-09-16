import type {
  CallPolicy,
  GuardrailCategory,
  SessionPolicy,
  ToolPolicy,
} from '@captar/types';
import { fingerprintRequest, RepetitionTracker, resolveRetryCount } from '@captar/utils';

import { PolicyViolationError } from './errors.js';

export interface GuardrailViolation {
  category: GuardrailCategory;
  message: string;
}

function semanticRequest(request: Record<string, unknown>): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(request)) {
    // Streaming controls change transport/return shape, not the semantic model
    // request. Everything else stays in the loop signature so new provider body
    // fields cannot silently bypass or poison repetition detection.
    if (key === 'stream' || key === 'stream_options') continue;
    normalized[key] = value;
  }
  return normalized;
}

export class PolicyEngine {
  private readonly repetitionTracker = new RepetitionTracker();
  private toolCallCount = 0;

  evaluateCall(
    request: Record<string, unknown>,
    policy?: SessionPolicy,
    estimatedCostUsd?: number,
    requestOptions?: Record<string, unknown>,
  ): void {
    const callPolicy = policy?.call;
    const budgetPolicy = policy?.budget;
    const model = typeof request.model === 'string' ? request.model : undefined;

    this.assertCallPolicy(callPolicy, request, model, estimatedCostUsd, requestOptions);

    if (typeof budgetPolicy?.maxRepeatedCalls === 'number') {
      const fingerprint = fingerprintRequest(semanticRequest(request));
      const count = this.repetitionTracker.record(fingerprint);
      if (count > budgetPolicy.maxRepeatedCalls) {
        throw new PolicyViolationError(
          `Blocked repeated call fingerprint after ${count} matching requests.`,
        );
      }
    }
  }

  /** Static tool policy/capacity checks that do not consume the call quota. */
  assertToolPolicy(name: string, policy?: ToolPolicy): void {
    if (policy?.allowedTools && !policy.allowedTools.includes(name)) {
      throw new PolicyViolationError(`Tool "${name}" is not in the allow list.`);
    }

    if (policy?.blockedTools?.includes(name)) {
      throw new PolicyViolationError(`Tool "${name}" is blocked by policy.`);
    }

    const maxCallsPerSession = policy?.maxCallsPerSession;
    if (
      typeof maxCallsPerSession === 'number' &&
      this.toolCallCount >= maxCallsPerSession
    ) {
      throw new PolicyViolationError(
        `Session exceeded tool maxCallsPerSession=${maxCallsPerSession}.`,
      );
    }
  }

  /**
   * Atomically admit one tool execution against the session-scoped call ceiling.
   * The returned rollback is used when the immediately following budget reserve
   * fails, keeping policy quota and SessionSummary admission semantics aligned.
   */
  admitTool(name: string, policy?: ToolPolicy): () => void {
    this.assertToolPolicy(name, policy);
    this.toolCallCount += 1;
    let rolledBack = false;

    return () => {
      if (rolledBack) return;
      rolledBack = true;
      this.toolCallCount = Math.max(0, this.toolCallCount - 1);
    };
  }

  /** Backward-compatible internal alias for immediate admission callers. */
  evaluateTool(name: string, policy?: ToolPolicy): void {
    this.admitTool(name, policy);
  }

  private assertCallPolicy(
    policy: CallPolicy | undefined,
    request: Record<string, unknown>,
    model: string | undefined,
    estimatedCostUsd?: number,
    requestOptions?: Record<string, unknown>,
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
      typeof estimatedCostUsd === 'number' &&
      typeof policy.maxEstimatedCostUsd === 'number' &&
      estimatedCostUsd > policy.maxEstimatedCostUsd
    ) {
      throw new PolicyViolationError(
        `Estimated cost $${estimatedCostUsd.toFixed(4)} exceeds maxEstimatedCostUsd.`,
      );
    }

    const requestedOutputTokens = [
      request.max_output_tokens,
      request.max_completion_tokens,
      request.max_tokens,
    ].find((value): value is number => typeof value === 'number');

    if (
      typeof policy.maxOutputTokens === 'number' &&
      typeof requestedOutputTokens === 'number' &&
      requestedOutputTokens > policy.maxOutputTokens
    ) {
      throw new PolicyViolationError(
        `Requested output tokens exceed policy limit ${policy.maxOutputTokens}.`,
      );
    }

    const requestOptionRetries = requestOptions?.maxRetries;
    const retryCount =
      typeof requestOptionRetries === 'number'
        ? requestOptionRetries
        : resolveRetryCount(request);
    if (
      typeof policy.retriesCeiling === 'number' &&
      retryCount > policy.retriesCeiling
    ) {
      throw new PolicyViolationError(
        `Retry count ${retryCount} exceeds retriesCeiling=${policy.retriesCeiling}.`,
      );
    }
  }
}
