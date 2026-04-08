"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";

interface CriterionDraft {
  label: string;
  description: string;
  weight: string;
}

const defaultCriteria = (): CriterionDraft[] => [
  {
    label: "Accuracy",
    description: "Did the output answer the prompt correctly?",
    weight: "2",
  },
  {
    label: "Grounding",
    description: "Was the answer supported by the available context?",
    weight: "1",
  },
];

export function ManualEvalCreateForm({
  projectId,
  datasetId,
}: {
  projectId: string;
  datasetId: string;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [reviewerInstructions, setReviewerInstructions] = useState("");
  const [criteria, setCriteria] = useState<CriterionDraft[]>(defaultCriteria);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const validCriteria = criteria.filter((criterion) => criterion.label.trim().length > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create manual eval</CardTitle>
        <CardDescription>
          Turn this dataset into a reviewer-led rubric so rows can be scored offline.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="manual-eval-name">Name</Label>
          <Input
            id="manual-eval-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="refund-response-quality"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="manual-eval-description">Description</Label>
          <Textarea
            id="manual-eval-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Manual pass/fail review for refund and escalation traces."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="manual-eval-reviewer-instructions">
            Reviewer instructions
          </Label>
          <Textarea
            id="manual-eval-reviewer-instructions"
            value={reviewerInstructions}
            onChange={(event) => setReviewerInstructions(event.target.value)}
            placeholder="Review each row for correctness, policy fit, and whether the answer stays grounded in the available information."
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <Label>Rubric criteria</Label>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCriteria((current) => [
                  ...current,
                  {
                    label: "",
                    description: "",
                    weight: "1",
                  },
                ]);
              }}
            >
              Add criterion
            </Button>
          </div>

          {criteria.map((criterion, index) => (
            <div
              key={`${index}-${criterion.label}`}
              className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"
            >
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`criterion-label-${index}`}>Label</Label>
                  <Input
                    id={`criterion-label-${index}`}
                    value={criterion.label}
                    onChange={(event) =>
                      setCriteria((current) =>
                        current.map((entry, entryIndex) =>
                          entryIndex === index
                            ? { ...entry, label: event.target.value }
                            : entry,
                        ),
                      )
                    }
                    placeholder="Accuracy"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`criterion-description-${index}`}>Description</Label>
                  <Textarea
                    id={`criterion-description-${index}`}
                    value={criterion.description}
                    onChange={(event) =>
                      setCriteria((current) =>
                        current.map((entry, entryIndex) =>
                          entryIndex === index
                            ? { ...entry, description: event.target.value }
                            : entry,
                        ),
                      )
                    }
                    className="min-h-[88px]"
                    placeholder="Does the answer match the expected outcome?"
                  />
                </div>

                <div className="flex items-end gap-3">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor={`criterion-weight-${index}`}>Weight</Label>
                    <Input
                      id={`criterion-weight-${index}`}
                      type="number"
                      min={1}
                      max={10}
                      value={criterion.weight}
                      onChange={(event) =>
                        setCriteria((current) =>
                          current.map((entry, entryIndex) =>
                            entryIndex === index
                              ? { ...entry, weight: event.target.value }
                              : entry,
                          ),
                        )
                      }
                    />
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    disabled={criteria.length <= 1}
                    onClick={() =>
                      setCriteria((current) =>
                        current.filter((_, entryIndex) => entryIndex !== index),
                      )
                    }
                  >
                    Remove
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {error ? <p className="text-sm text-rose-300">{error}</p> : null}

        <Button
          disabled={isPending || !name.trim() || validCriteria.length === 0}
          onClick={() => {
            startTransition(async () => {
              setError(null);

              const response = await fetch(`/api/projects/${projectId}/evals`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                  datasetId,
                  name,
                  description,
                  reviewerInstructions,
                  criteria: validCriteria.map((criterion) => ({
                    label: criterion.label,
                    description: criterion.description,
                    weight: Number.parseInt(criterion.weight || "1", 10) || 1,
                  })),
                }),
              });

              if (!response.ok) {
                const payload = (await response.json().catch(() => null)) as
                  | { error?: string }
                  | null;
                setError(payload?.error ?? "Could not create manual eval.");
                return;
              }

              const payload = (await response.json()) as {
                manualEval: { id: string };
              };

              router.push(`/projects/${projectId}/evals/${payload.manualEval.id}`);
              router.refresh();
            });
          }}
        >
          {isPending ? "Creating..." : "Create manual eval"}
        </Button>
      </CardContent>
    </Card>
  );
}
