"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "./ui/button";

export function ManualEvalStartRunButton({
  projectId,
  manualEvalId,
  disabled,
}: {
  projectId: string;
  manualEvalId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-2">
      <Button
        disabled={disabled || isPending}
        onClick={() => {
          startTransition(async () => {
            setError(null);

            const response = await fetch(
              `/api/projects/${projectId}/evals/${manualEvalId}/runs`,
              {
                method: "POST",
              },
            );

            if (!response.ok) {
              const payload = (await response.json().catch(() => null)) as
                | { error?: string }
                | null;
              setError(payload?.error ?? "Could not start manual eval run.");
              return;
            }

            const payload = (await response.json()) as {
              run: { id: string };
            };
            router.push(
              `/projects/${projectId}/evals/${manualEvalId}/runs/${payload.run.id}`,
            );
            router.refresh();
          });
        }}
      >
        {isPending ? "Starting..." : "Start run"}
      </Button>
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
    </div>
  );
}
