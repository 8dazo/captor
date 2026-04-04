import type { CaptarEvent } from "@captar/types";

import { EventFeed } from "../components/event-feed";

const sampleEvents: CaptarEvent[] = [
  {
    id: "evt_demo_started",
    type: "session.started",
    timestamp: new Date("2026-04-04T10:00:00.000Z").toISOString(),
    sessionId: "session_demo",
    trace: {
      traceId: "trace_demo",
      spanId: "span_demo_started",
    },
    project: "support-bot",
    metadata: {
      _user: "u_123",
      _team: "support",
    },
    data: {
      status: "started",
    },
  },
  {
    id: "evt_demo_spend",
    type: "spend.committed",
    timestamp: new Date("2026-04-04T10:00:03.000Z").toISOString(),
    sessionId: "session_demo",
    trace: {
      traceId: "trace_demo",
      spanId: "span_demo_spend",
      parentSpanId: "span_demo_started",
    },
    project: "support-bot",
    metadata: {
      _user: "u_123",
      _team: "support",
    },
    data: {
      actualCostUsd: 0.038,
      releasedUsd: 0.022,
    },
  },
];

export default function PlatformHomePage() {
  return (
    <main style={{ padding: "3rem 1.5rem", maxWidth: "960px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "2.5rem" }}>Captar Platform Stub</h1>
      <p style={{ maxWidth: "42rem", lineHeight: 1.7 }}>
        This v1 platform app intentionally stays thin: ingest validation,
        health endpoints, and a local event inspection view for exporter
        testing.
      </p>
      <EventFeed events={sampleEvents} />
    </main>
  );
}
