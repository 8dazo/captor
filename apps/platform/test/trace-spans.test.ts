import { LedgerKind, TraceStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { buildTraceSpanTree, buildTraceTimeline, summarizeTraceFromSpans } from "../lib/trace-spans";

describe("trace span helpers", () => {
  const spans = [
    {
      externalSpanId: "session",
      name: "session",
      kind: "SESSION",
      status: "COMPLETED",
      startedAt: new Date("2026-04-08T00:00:00.000Z"),
      endedAt: new Date("2026-04-08T00:00:10.000Z"),
      attributes: { sessionId: "session_1" },
    },
    {
      externalSpanId: "request",
      externalParentSpanId: "session",
      name: "responses.create",
      kind: "REQUEST",
      status: "COMPLETED",
      startedAt: new Date("2026-04-08T00:00:01.000Z"),
      endedAt: new Date("2026-04-08T00:00:05.000Z"),
      attributes: { inputTokens: 120, outputTokens: 40, costUsd: 0.12 },
    },
    {
      externalSpanId: "tool",
      externalParentSpanId: "session",
      name: "search.docs",
      kind: "TOOL",
      status: "FAILED",
      startedAt: new Date("2026-04-08T00:00:06.000Z"),
      endedAt: new Date("2026-04-08T00:00:08.000Z"),
      attributes: { toolName: "search.docs" },
    },
  ];

  it("builds a nested trace tree using parent span ids", () => {
    const tree = buildTraceSpanTree(spans);

    expect(tree).toHaveLength(1);
    expect(tree[0]?.externalSpanId).toBe("session");
    expect(tree[0]?.children.map((child) => child.externalSpanId)).toEqual([
      "request",
      "tool",
    ]);
  });

  it("summarizes status, tokens, and costs from spans and ledgers", () => {
    const summary = summarizeTraceFromSpans(spans, [
      { kind: LedgerKind.RESERVED, amountUsd: 0.2 },
      { kind: LedgerKind.COMMITTED, amountUsd: 0.12 },
      { kind: LedgerKind.RELEASED, amountUsd: 0.08 },
    ]);

    expect(summary.status).toBe(TraceStatus.FAILED);
    expect(summary.inputTokens).toBe(120);
    expect(summary.outputTokens).toBe(40);
    expect(summary.estimatedCostUsd).toBeCloseTo(0.2);
    expect(summary.actualCostUsd).toBeCloseTo(0.12);
  });

  it("builds timeline offsets from span start times", () => {
    const timeline = buildTraceTimeline(spans);

    expect(timeline[0]?.offsetMs).toBe(0);
    expect(timeline[1]?.offsetMs).toBe(1000);
    expect(timeline[2]?.offsetMs).toBe(6000);
  });
});

