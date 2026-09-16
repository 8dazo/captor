import type {
  BudgetPolicy,
  CallPolicy,
  SessionPolicy,
  ToolPolicy,
} from '@captar/types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function assertFiniteNonNegative(value: unknown, label: string): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} must be a finite non-negative number.`);
  }
  return value;
}

function assertIntegerNonNegative(value: unknown, label: string): number | undefined {
  const numeric = assertFiniteNonNegative(value, label);
  if (numeric === undefined) return undefined;
  if (!Number.isInteger(numeric)) {
    throw new RangeError(`${label} must be a non-negative integer.`);
  }
  return numeric;
}

function assertPositiveInteger(value: unknown, label: string): number | undefined {
  const numeric = assertIntegerNonNegative(value, label);
  if (numeric === undefined) return undefined;
  if (numeric < 1) {
    throw new RangeError(`${label} must be a positive integer.`);
  }
  return numeric;
}

function assertStringArray(value: unknown, label: string): string[] | undefined {
  if (value === undefined) return undefined;
  if (
    !Array.isArray(value) ||
    value.some((entry) => typeof entry !== 'string' || entry.trim().length === 0)
  ) {
    throw new RangeError(`${label} must be an array of non-empty strings.`);
  }
  return [...new Set(value)];
}

function validateBudgetPolicy(value: unknown, label: string): BudgetPolicy | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) {
    throw new RangeError(`${label} must be an object.`);
  }

  const policy: BudgetPolicy = {};
  const maxSpendUsd = assertFiniteNonNegative(value.maxSpendUsd, `${label}.maxSpendUsd`);
  const finalizationReserveUsd = assertFiniteNonNegative(
    value.finalizationReserveUsd,
    `${label}.finalizationReserveUsd`,
  );
  const maxRepeatedCalls = assertIntegerNonNegative(
    value.maxRepeatedCalls,
    `${label}.maxRepeatedCalls`,
  );

  if (value.softLimitPct !== undefined) {
    if (
      typeof value.softLimitPct !== 'number' ||
      !Number.isFinite(value.softLimitPct) ||
      value.softLimitPct < 0 ||
      value.softLimitPct > 1
    ) {
      throw new RangeError(`${label}.softLimitPct must be a finite number between 0 and 1.`);
    }
    policy.softLimitPct = value.softLimitPct;
  }

  if (maxSpendUsd !== undefined) policy.maxSpendUsd = maxSpendUsd;
  if (finalizationReserveUsd !== undefined) {
    policy.finalizationReserveUsd = finalizationReserveUsd;
  }
  if (maxRepeatedCalls !== undefined) policy.maxRepeatedCalls = maxRepeatedCalls;

  if (
    maxSpendUsd !== undefined &&
    finalizationReserveUsd !== undefined &&
    finalizationReserveUsd > maxSpendUsd
  ) {
    throw new RangeError(`${label}.finalizationReserveUsd cannot exceed maxSpendUsd.`);
  }

  return policy;
}

function validateCallPolicy(value: unknown, label: string): CallPolicy | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) {
    throw new RangeError(`${label} must be an object.`);
  }

  const policy: CallPolicy = {};
  const allowedModels = assertStringArray(value.allowedModels, `${label}.allowedModels`);
  const blockedModels = assertStringArray(value.blockedModels, `${label}.blockedModels`);
  const maxEstimatedCostUsd = assertFiniteNonNegative(
    value.maxEstimatedCostUsd,
    `${label}.maxEstimatedCostUsd`,
  );
  const maxOutputTokens = assertIntegerNonNegative(
    value.maxOutputTokens,
    `${label}.maxOutputTokens`,
  );
  const maxCallsPerSession = assertIntegerNonNegative(
    value.maxCallsPerSession,
    `${label}.maxCallsPerSession`,
  );
  const maxConcurrentCalls = assertIntegerNonNegative(
    value.maxConcurrentCalls,
    `${label}.maxConcurrentCalls`,
  );
  const timeoutMs = assertPositiveInteger(value.timeoutMs, `${label}.timeoutMs`);
  const retriesCeiling = assertIntegerNonNegative(
    value.retriesCeiling,
    `${label}.retriesCeiling`,
  );

  if (allowedModels !== undefined) policy.allowedModels = allowedModels;
  if (blockedModels !== undefined) policy.blockedModels = blockedModels;
  if (maxEstimatedCostUsd !== undefined) policy.maxEstimatedCostUsd = maxEstimatedCostUsd;
  if (maxOutputTokens !== undefined) policy.maxOutputTokens = maxOutputTokens;
  if (maxCallsPerSession !== undefined) policy.maxCallsPerSession = maxCallsPerSession;
  if (maxConcurrentCalls !== undefined) policy.maxConcurrentCalls = maxConcurrentCalls;
  if (timeoutMs !== undefined) policy.timeoutMs = timeoutMs;
  if (retriesCeiling !== undefined) policy.retriesCeiling = retriesCeiling;

  return policy;
}

function validateToolPolicy(value: unknown, label: string): ToolPolicy | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) {
    throw new RangeError(`${label} must be an object.`);
  }

  const policy: ToolPolicy = {};
  const allowedTools = assertStringArray(value.allowedTools, `${label}.allowedTools`);
  const blockedTools = assertStringArray(value.blockedTools, `${label}.blockedTools`);
  const requireApprovalFor = assertStringArray(
    value.requireApprovalFor,
    `${label}.requireApprovalFor`,
  );
  const maxCallsPerSession = assertIntegerNonNegative(
    value.maxCallsPerSession,
    `${label}.maxCallsPerSession`,
  );

  if (allowedTools !== undefined) policy.allowedTools = allowedTools;
  if (blockedTools !== undefined) policy.blockedTools = blockedTools;
  if (requireApprovalFor !== undefined) policy.requireApprovalFor = requireApprovalFor;
  if (maxCallsPerSession !== undefined) policy.maxCallsPerSession = maxCallsPerSession;

  return policy;
}

export function validateSessionPolicy(value: unknown, label = 'policy'): SessionPolicy | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) {
    throw new RangeError(`${label} must be an object.`);
  }

  const policy: SessionPolicy = {};
  const budget = validateBudgetPolicy(value.budget, `${label}.budget`);
  const call = validateCallPolicy(value.call, `${label}.call`);
  const tool = validateToolPolicy(value.tool, `${label}.tool`);
  if (budget !== undefined) policy.budget = budget;
  if (call !== undefined) policy.call = call;
  if (tool !== undefined) policy.tool = tool;
  return policy;
}

export function overlayPolicy(
  base: SessionPolicy | undefined,
  override: SessionPolicy | undefined,
): SessionPolicy | undefined {
  if (!base && !override) return undefined;
  return validateSessionPolicy(
    {
      budget: { ...base?.budget, ...override?.budget },
      call: { ...base?.call, ...override?.call },
      tool: { ...base?.tool, ...override?.tool },
    },
    'effective policy',
  );
}

function minimum(left: number | undefined, right: number | undefined): number | undefined {
  if (left === undefined) return right;
  if (right === undefined) return left;
  return Math.min(left, right);
}

function maximum(left: number | undefined, right: number | undefined): number | undefined {
  if (left === undefined) return right;
  if (right === undefined) return left;
  return Math.max(left, right);
}

function union(left: string[] | undefined, right: string[] | undefined): string[] | undefined {
  if (!left) return right ? [...right] : undefined;
  if (!right) return [...left];
  return [...new Set([...left, ...right])];
}

function intersection(
  left: string[] | undefined,
  right: string[] | undefined,
): string[] | undefined {
  if (!left) return right ? [...right] : undefined;
  if (!right) return [...left];
  const allowed = new Set(right);
  return left.filter((entry) => allowed.has(entry));
}

/**
 * Combine two already-authoritative policy layers without allowing either side
 * to weaken the other. Numeric ceilings choose the lower value, block/approval
 * sets are unions, and allowlists are intersections.
 */
export function restrictPolicy(
  left: SessionPolicy | undefined,
  right: SessionPolicy | undefined,
): SessionPolicy | undefined {
  const a = validateSessionPolicy(left, 'base policy');
  const b = validateSessionPolicy(right, 'restricting policy');
  if (!a && !b) return undefined;

  return validateSessionPolicy(
    {
      budget: {
        maxSpendUsd: minimum(a?.budget?.maxSpendUsd, b?.budget?.maxSpendUsd),
        softLimitPct: minimum(a?.budget?.softLimitPct, b?.budget?.softLimitPct),
        finalizationReserveUsd: maximum(
          a?.budget?.finalizationReserveUsd,
          b?.budget?.finalizationReserveUsd,
        ),
        maxRepeatedCalls: minimum(
          a?.budget?.maxRepeatedCalls,
          b?.budget?.maxRepeatedCalls,
        ),
      },
      call: {
        allowedModels: intersection(a?.call?.allowedModels, b?.call?.allowedModels),
        blockedModels: union(a?.call?.blockedModels, b?.call?.blockedModels),
        maxEstimatedCostUsd: minimum(
          a?.call?.maxEstimatedCostUsd,
          b?.call?.maxEstimatedCostUsd,
        ),
        maxOutputTokens: minimum(a?.call?.maxOutputTokens, b?.call?.maxOutputTokens),
        maxCallsPerSession: minimum(
          a?.call?.maxCallsPerSession,
          b?.call?.maxCallsPerSession,
        ),
        maxConcurrentCalls: minimum(
          a?.call?.maxConcurrentCalls,
          b?.call?.maxConcurrentCalls,
        ),
        timeoutMs: minimum(a?.call?.timeoutMs, b?.call?.timeoutMs),
        retriesCeiling: minimum(a?.call?.retriesCeiling, b?.call?.retriesCeiling),
      },
      tool: {
        allowedTools: intersection(a?.tool?.allowedTools, b?.tool?.allowedTools),
        blockedTools: union(a?.tool?.blockedTools, b?.tool?.blockedTools),
        maxCallsPerSession: minimum(
          a?.tool?.maxCallsPerSession,
          b?.tool?.maxCallsPerSession,
        ),
        requireApprovalFor: union(
          a?.tool?.requireApprovalFor,
          b?.tool?.requireApprovalFor,
        ),
      },
    },
    'restricted policy',
  );
}
