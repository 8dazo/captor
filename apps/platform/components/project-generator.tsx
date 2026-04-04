"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function ProjectGenerator() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div style={{ display: "grid", gap: "0.75rem" }}>
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          startTransition(async () => {
            setError(null);
            const response = await fetch("/api/projects", {
              method: "POST",
              headers: {
                "content-type": "application/json",
              },
              body: JSON.stringify({}),
            });

            if (!response.ok) {
              setError("Failed to create project.");
              return;
            }

            const payload = (await response.json()) as {
              project: { id: string };
            };
            router.push(`/projects/${payload.project.id}`);
            router.refresh();
          });
        }}
        style={{
          border: 0,
          borderRadius: "999px",
          padding: "0.9rem 1.2rem",
          background: isPending ? "#7dd3fc" : "#38bdf8",
          color: "#0f172a",
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        {isPending ? "Creating..." : "Generate Project ID"}
      </button>
      {error ? (
        <p style={{ margin: 0, color: "#fca5a5" }}>{error}</p>
      ) : null}
    </div>
  );
}
