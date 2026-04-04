import Link from "next/link";
import { notFound } from "next/navigation";

import { EventFeed } from "../../../components/event-feed";
import {
  getProjectById,
  getProjectSessions,
  getProjectTimeline,
} from "../../../lib/control-plane";

export const dynamic = "force-dynamic";

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <article
      style={{
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: "18px",
        padding: "1rem",
        background: "rgba(15,23,42,0.82)",
      }}
    >
      <p style={{ margin: 0, opacity: 0.7, fontSize: "0.82rem" }}>{label}</p>
      <strong style={{ fontSize: "1.5rem" }}>{value}</strong>
    </article>
  );
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const project = getProjectById(projectId);

  if (!project) {
    notFound();
  }

  const sessions = getProjectSessions(projectId);
  const timeline = getProjectTimeline(projectId);
  const violations = timeline.filter((event) => event.type === "request.blocked");
  const committedSpend = sessions.reduce(
    (total, session) => total + (session.summary?.totalCommittedUsd ?? 0),
    0,
  );

  return (
    <main
      style={{
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "2rem 1.5rem 4rem",
        display: "grid",
        gap: "1.25rem",
      }}
    >
      <Link href="/" style={{ color: "#7dd3fc", textDecoration: "none" }}>
        Back to projects
      </Link>

      <section
        style={{
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: "24px",
          padding: "1.5rem",
          background:
            "radial-gradient(circle at top right, rgba(74,222,128,0.18), transparent 35%), rgba(15,23,42,0.88)",
        }}
      >
        <p
          style={{
            margin: 0,
            opacity: 0.72,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            fontSize: "0.8rem",
          }}
        >
          Captar Project
        </p>
        <h1 style={{ margin: "0.4rem 0", fontSize: "2.4rem" }}>{project.name}</h1>
        <p style={{ margin: 0, lineHeight: 1.7 }}>
          Hook this ID into the SDK with `controlPlane.projectId="{project.id}"` to
          stream local events and use the saved policy below.
        </p>
        <pre
          style={{
            marginTop: "1rem",
            padding: "1rem",
            borderRadius: "14px",
            background: "rgba(15,23,42,0.95)",
            overflowX: "auto",
          }}
        >
{`const captor = createCaptar({
  project: "support-bot",
  controlPlane: {
    projectId: "${project.id}",
    baseUrl: "http://localhost:3000",
    syncPolicy: true,
  },
  exporter: { url: "http://localhost:3000/api/ingest" },
});`}
        </pre>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "1rem",
        }}
      >
        <StatCard label="Sessions" value={sessions.length} />
        <StatCard label="Events" value={timeline.length} />
        <StatCard label="Blocked" value={violations.length} />
        <StatCard label="Committed USD" value={committedSpend.toFixed(4)} />
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "1.1fr 0.9fr",
          gap: "1rem",
          alignItems: "start",
        }}
      >
        <article
          style={{
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "20px",
            padding: "1.25rem",
            background: "rgba(15,23,42,0.82)",
          }}
        >
          <h2 style={{ marginTop: 0 }}>Live Event Timeline</h2>
          <EventFeed events={timeline} />
        </article>

        <article
          style={{
            display: "grid",
            gap: "1rem",
          }}
        >
          <div
            style={{
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "20px",
              padding: "1.25rem",
              background: "rgba(15,23,42,0.82)",
            }}
          >
            <h2 style={{ marginTop: 0 }}>Saved Policy</h2>
            <pre
              style={{
                margin: 0,
                padding: "1rem",
                borderRadius: "14px",
                background: "rgba(2,6,23,0.84)",
                overflowX: "auto",
              }}
            >
              {JSON.stringify(project.policy, null, 2)}
            </pre>
          </div>

          <div
            style={{
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "20px",
              padding: "1.25rem",
              background: "rgba(15,23,42,0.82)",
            }}
          >
            <h2 style={{ marginTop: 0 }}>Session Summaries</h2>
            <div style={{ display: "grid", gap: "0.8rem" }}>
              {sessions.map((session) => (
                <article
                  key={session.sessionId}
                  style={{
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "16px",
                    padding: "0.9rem",
                    background: "rgba(2,6,23,0.84)",
                  }}
                >
                  <strong>{session.sessionId}</strong>
                  <p style={{ margin: "0.4rem 0 0" }}>
                    requests: {session.summary?.requestCount ?? 0} | blocked:{" "}
                    {session.summary?.blockedCount ?? 0} | committed: $
                    {(session.summary?.totalCommittedUsd ?? 0).toFixed(4)}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </article>
      </section>
    </main>
  );
}
