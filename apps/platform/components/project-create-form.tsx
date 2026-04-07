"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export function ProjectCreateForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create project</CardTitle>
        <CardDescription>
          Projects organize your hook connections, sessions, traces, and policies.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="project-name">Project name</Label>
          <Input
            id="project-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Support Agent"
          />
        </div>
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        <Button
          disabled={isPending || !name.trim()}
          onClick={() => {
            startTransition(async () => {
              setError(null);
              const response = await fetch("/api/projects", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ name }),
              });

              if (!response.ok) {
                setError("Could not create project.");
                return;
              }

              const payload = (await response.json()) as {
                project: { id: string };
              };
              router.push(`/projects/${payload.project.id}`);
              router.refresh();
            });
          }}
        >
          {isPending ? "Creating..." : "Create project"}
        </Button>
      </CardContent>
    </Card>
  );
}
