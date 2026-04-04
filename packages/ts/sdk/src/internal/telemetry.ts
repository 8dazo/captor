import type { CaptarEvent } from "@captar/types";

export interface OTelSpanRecord {
  traceId: string;
  spanId: string;
  name: string;
  attributes: Record<string, string | number | boolean>;
}

export function eventToSpanRecord(event: CaptarEvent): OTelSpanRecord {
  return {
    traceId: event.trace.traceId,
    spanId: event.trace.spanId,
    name: event.type,
    attributes: {
      sessionId: event.sessionId,
      project: event.project ?? "unknown",
      eventType: event.type,
    },
  };
}
