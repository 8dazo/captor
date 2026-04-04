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
          <strong>{event.type}</strong>
          <p style={{ margin: "0.35rem 0 0" }}>{event.timestamp}</p>
        </article>
      ))}
    </div>
  );
}
