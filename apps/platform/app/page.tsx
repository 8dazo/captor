import Link from "next/link";

import { listProjects } from "../lib/control-plane";
import { ProjectGenerator } from "../components/project-generator";

export const dynamic = "force-dynamic";

export default function PlatformHomePage() {
  const projects = listProjects();

  return (
    <main
      style={{
        padding: "3rem 1.5rem",
        maxWidth: "1100px",
        margin: "0 auto",
        display: "grid",
        gap: "1.5rem",
      }}
    >
      <section
        style={{
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: "24px",
          padding: "1.5rem",
          background:
            "radial-gradient(circle at top left, rgba(56,189,248,0.18), transparent 40%), rgba(15,23,42,0.88)",
        }}
      >
        <h1 style={{ fontSize: "2.5rem", marginBottom: "0.6rem" }}>
          Captar Control Plane
        </h1>
        <p style={{ maxWidth: "44rem", lineHeight: 1.7, marginBottom: "1.25rem" }}>
          Generate a local project ID, attach it to your SDK calls, and inspect
          the sessions, events, spend data, and applied policies in one place.
        </p>
        <ProjectGenerator />
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "1rem",
        }}
      >
        {projects.map((project) => (
          <Link
            key={project.id}
            href={`/projects/${project.id}`}
            style={{
              textDecoration: "none",
              color: "inherit",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "20px",
              padding: "1.25rem",
              background: "rgba(15,23,42,0.82)",
            }}
          >
            <p
              style={{
                margin: 0,
                opacity: 0.72,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                fontSize: "0.75rem",
              }}
            >
              Project ID
            </p>
            <strong style={{ display: "block", margin: "0.5rem 0", fontSize: "1.1rem" }}>
              {project.id}
            </strong>
            <p style={{ margin: 0 }}>{project.name}</p>
          </Link>
        ))}
      </section>
    </main>
  );
}
