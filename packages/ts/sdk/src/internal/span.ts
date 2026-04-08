import type {
  Metadata,
  TraceSpanKind,
  TraceSpanSnapshot,
  TraceSpanStatus,
} from "@captar/types";
import { createId } from "@captar/utils";

export function createSpanSnapshot(input: {
  id?: string;
  parentId?: string;
  name: string;
  kind: TraceSpanKind;
  status?: TraceSpanStatus;
  startedAt?: string;
  endedAt?: string;
  attributes?: Metadata;
}): TraceSpanSnapshot {
  return {
    id: input.id ?? createId("span"),
    parentId: input.parentId,
    name: input.name,
    kind: input.kind,
    status: input.status ?? "running",
    startedAt: input.startedAt ?? new Date().toISOString(),
    endedAt: input.endedAt,
    attributes: input.attributes,
  };
}

export function updateSpanSnapshot(
  span: TraceSpanSnapshot,
  input: {
    parentId?: string;
    status?: TraceSpanStatus;
    endedAt?: string;
    attributes?: Metadata;
  },
): TraceSpanSnapshot {
  const nextAttributes =
    span.attributes || input.attributes
      ? {
          ...(span.attributes ?? {}),
          ...(input.attributes ?? {}),
        }
      : undefined;

  return {
    ...span,
    parentId: input.parentId ?? span.parentId,
    status: input.status ?? span.status,
    endedAt: input.endedAt ?? span.endedAt,
    attributes: nextAttributes,
  };
}
