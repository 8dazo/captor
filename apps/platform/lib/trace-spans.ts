import { LedgerKind, TraceStatus } from '@prisma/client';

interface TraceSpanLike {
  externalSpanId: string;
  externalParentSpanId?: string | null;
  name: string;
  kind: string;
  status: string;
  startedAt: Date;
  endedAt?: Date | null;
  attributes?: unknown;
}

interface SpendEntryLike {
  kind: LedgerKind;
  amountUsd: number | { toString(): string };
}

export interface TraceSpanNode extends TraceSpanLike {
  attributes: Record<string, unknown>;
  children: TraceSpanNode[];
  depth: number;
  durationMs?: number;
}

export interface TraceTimelineItem extends TraceSpanLike {
  attributes: Record<string, unknown>;
  durationMs?: number;
  offsetMs: number;
}

function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function toNumber(value: number | { toString(): string } | unknown): number {
  if (typeof value === 'number') {
    return value;
  }
  if (value && typeof value === 'object' && 'toString' in value) {
    return Number(value.toString());
  }
  return Number(value ?? 0);
}

function attributeNumber(value: unknown): number {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function durationMs(span: Pick<TraceSpanLike, 'startedAt' | 'endedAt'>): number | undefined {
  if (!span.endedAt) {
    return undefined;
  }
  return Math.max(0, span.endedAt.getTime() - span.startedAt.getTime());
}

export function deriveTraceStatusFromSpans(
  spans: Array<Pick<TraceSpanLike, 'status'>>
): TraceStatus {
  if (spans.some((span) => span.status === 'FAILED')) {
    return TraceStatus.FAILED;
  }
  if (spans.some((span) => span.status === 'BLOCKED')) {
    return TraceStatus.BLOCKED;
  }
  if (spans.some((span) => span.status === 'RUNNING')) {
    return TraceStatus.RUNNING;
  }
  return TraceStatus.COMPLETED;
}

export function summarizeTraceFromSpans(spans: TraceSpanLike[], spendEntries: SpendEntryLike[]) {
  const orderedSpans = [...spans].sort(
    (left, right) => left.startedAt.getTime() - right.startedAt.getTime()
  );
  const startedAt = orderedSpans[0]?.startedAt ?? null;
  const completedAt =
    orderedSpans.length > 0 && orderedSpans.every((span) => span.endedAt)
      ? orderedSpans.reduce<Date | null>((latest, span) => {
          if (!span.endedAt) {
            return latest;
          }
          if (!latest || span.endedAt.getTime() > latest.getTime()) {
            return span.endedAt;
          }
          return latest;
        }, null)
      : null;

  const tokenSummary = orderedSpans.reduce(
    (totals, span) => {
      if (span.kind !== 'REQUEST') {
        return totals;
      }

      const attributes = asObject(span.attributes);
      totals.inputTokens += attributeNumber(attributes.inputTokens);
      totals.outputTokens += attributeNumber(attributes.outputTokens);
      totals.cachedInputTokens += attributeNumber(attributes.cachedInputTokens);
      return totals;
    },
    {
      inputTokens: 0,
      outputTokens: 0,
      cachedInputTokens: 0,
    }
  );

  const estimatedCostUsd = spendEntries
    .filter((entry) => entry.kind === LedgerKind.RESERVED)
    .reduce((total, entry) => total + toNumber(entry.amountUsd), 0);
  const actualCostUsd = spendEntries
    .filter((entry) => entry.kind === LedgerKind.COMMITTED)
    .reduce((total, entry) => total + toNumber(entry.amountUsd), 0);

  return {
    status: deriveTraceStatusFromSpans(orderedSpans),
    startedAt,
    completedAt,
    estimatedCostUsd,
    actualCostUsd,
    inputTokens: tokenSummary.inputTokens,
    outputTokens: tokenSummary.outputTokens,
    cachedInputTokens: tokenSummary.cachedInputTokens,
  };
}

function wouldCreateCycle(
  nodeId: string,
  ancestorId: string | undefined,
  nodeMap: Map<string, TraceSpanNode>
): boolean {
  let current = ancestorId;
  const seen = new Set<string>();
  while (current) {
    if (current === nodeId || seen.has(current)) {
      return true;
    }
    seen.add(current);
    current = nodeMap.get(current)?.externalParentSpanId ?? undefined;
  }
  return false;
}

export function buildTraceSpanTree(spans: TraceSpanLike[]): TraceSpanNode[] {
  const sortedSpans = [...spans].sort(
    (left, right) => left.startedAt.getTime() - right.startedAt.getTime()
  );
  const nodeMap = new Map<string, TraceSpanNode>();

  for (const span of sortedSpans) {
    nodeMap.set(span.externalSpanId, {
      ...span,
      attributes: asObject(span.attributes),
      children: [],
      depth: 0,
      durationMs: durationMs(span),
    });
  }

  const roots: TraceSpanNode[] = [];
  const visited = new Set<string>();

  for (const span of sortedSpans) {
    if (visited.has(span.externalSpanId)) {
      continue;
    }
    visited.add(span.externalSpanId);

    const node = nodeMap.get(span.externalSpanId);
    if (!node) {
      continue;
    }

    const parentId = span.externalParentSpanId ?? undefined;
    const parentNode = parentId ? nodeMap.get(parentId) : undefined;
    if (!parentNode || wouldCreateCycle(span.externalSpanId, parentId, nodeMap)) {
      roots.push(node);
      continue;
    }

    node.depth = parentNode.depth + 1;
    parentNode.children.push(node);
  }

  return roots;
}

export function flattenTraceSpanTree(nodes: TraceSpanNode[]): TraceSpanNode[] {
  const flattened: TraceSpanNode[] = [];

  for (const node of nodes) {
    flattened.push(node);
    flattened.push(...flattenTraceSpanTree(node.children));
  }

  return flattened;
}

export function buildTraceTimeline(spans: TraceSpanLike[]): TraceTimelineItem[] {
  const sortedSpans = [...spans].sort(
    (left, right) => left.startedAt.getTime() - right.startedAt.getTime()
  );
  const firstStart = sortedSpans[0]?.startedAt.getTime() ?? 0;

  return sortedSpans.map((span) => ({
    ...span,
    attributes: asObject(span.attributes),
    durationMs: durationMs(span),
    offsetMs: Math.max(0, span.startedAt.getTime() - firstStart),
  }));
}
