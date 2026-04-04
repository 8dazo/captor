import type { CaptarEvent } from "@captar/types";

export function EventFeed({ events }: { events: CaptarEvent[] }) {
  return (
    <div style={{ display: "grid", gap: "0.75rem" }}>
      {events.map((event) => (
        <article
          key={event.id}
          style={{
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "16px",
            padding: "1rem",
            background: "rgba(15,23,42,0.8)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "1rem",
              alignItems: "center",
            }}
          >
            <strong>{event.type}</strong>
            <span style={{ opacity: 0.7, fontSize: "0.8rem" }}>{event.timestamp}</span>
          </div>
          <p style={{ margin: "0.35rem 0", opacity: 0.78 }}>
            session: {event.sessionId}
          </p>
          <pre
            style={{
              margin: 0,
              padding: "0.75rem",
              borderRadius: "12px",
              background: "rgba(2,6,23,0.84)",
              overflowX: "auto",
              whiteSpace: "pre-wrap",
            }}
          >
            {JSON.stringify(event.data, null, 2)}
          </pre>
        </article>
      ))}
    </div>
  );
}
