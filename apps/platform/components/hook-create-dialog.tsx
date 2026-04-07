"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export function HookCreateDialog({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [environment, setEnvironment] = useState("development");
  const [isPending, startTransition] = useTransition();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Create hook connection</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New hook connection</DialogTitle>
          <DialogDescription>
            Create a hook ID your SDK can attach to calls.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="hook-name">Name</Label>
            <Input
              id="hook-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="support-webhook"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hook-env">Environment</Label>
            <Input
              id="hook-env"
              value={environment}
              onChange={(event) => setEnvironment(event.target.value)}
              placeholder="development"
            />
          </div>
          <Button
            disabled={isPending || !name.trim()}
            onClick={() => {
              startTransition(async () => {
                const response = await fetch(`/api/projects/${projectId}/hooks`, {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ name, environment }),
                });
                if (!response.ok) {
                  return;
                }
                const payload = (await response.json()) as {
                  hook: { publicId: string };
                };
                router.push(`/hooks/${payload.hook.publicId}`);
                router.refresh();
              });
            }}
          >
            {isPending ? "Creating..." : "Create hook"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
