"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";

export function DatasetCreateForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create dataset</CardTitle>
        <CardDescription>
          Capture reusable rows from traces or file imports without leaving the project.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="dataset-name">Name</Label>
          <Input
            id="dataset-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="refund-escalations"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dataset-description">Description</Label>
          <Textarea
            id="dataset-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="High-signal support traces for refund and escalation review."
          />
        </div>
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        <Button
          disabled={isPending || !name.trim()}
          onClick={() => {
            startTransition(async () => {
              setError(null);

              const response = await fetch(`/api/projects/${projectId}/datasets`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                  name,
                  description,
                }),
              });

              if (!response.ok) {
                const payload = (await response.json().catch(() => null)) as
                  | { error?: string }
                  | null;
                setError(payload?.error ?? "Could not create dataset.");
                return;
              }

              const payload = (await response.json()) as {
                dataset: { id: string };
              };
              router.push(`/projects/${projectId}/datasets/${payload.dataset.id}`);
              router.refresh();
            });
          }}
        >
          {isPending ? "Creating..." : "Create dataset"}
        </Button>
      </CardContent>
    </Card>
  );
}
