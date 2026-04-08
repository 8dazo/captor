"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";

import type { JsonValue, ManualEval, ManualEvalRun, ManualEvalVerdict } from "@captar/types";

import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";

const scoreOptions = [1, 2, 3, 4, 5];
const selectClassName =
  "flex h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300";

export function ManualEvalRunReviewer({
  projectId,
  manualEval,
  initialRun,
}: {
  projectId: string;
  manualEval: ManualEval;
  initialRun: ManualEvalRun;
}) {
  const [run, setRun] = useState(initialRun);
  const [selectedItemId, setSelectedItemId] = useState(initialRun.items[0]?.id ?? "");
  const [verdict, setVerdict] = useState<ManualEvalVerdict | "">("");
  const [notes, setNotes] = useState("");
  const [criterionScores, setCriterionScores] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedIndex = Math.max(
    run.items.findIndex((item) => item.id === selectedItemId),
    0,
  );
  const currentItem = run.items[selectedIndex];

  useEffect(() => {
    if (!currentItem) {
      return;
    }

    setVerdict(currentItem.verdict ?? "");
    setNotes(currentItem.notes ?? "");
    setCriterionScores(
      Object.fromEntries(
        manualEval.criteria.map((criterion) => [
          criterion.id,
          String(
            currentItem.criterionScores.find(
              (entry) => entry.criterionId === criterion.id,
            )?.score ?? "",
          ),
        ]),
      ),
    );
  }, [currentItem, manualEval.criteria]);

  if (!currentItem) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Run items</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-400">This run has no dataset rows to review.</p>
        </CardContent>
      </Card>
    );
  }

  const parsedScores = manualEval.criteria
    .map((criterion) => {
      const rawValue = criterionScores[criterion.id] ?? "";
      const score = Number.parseInt(rawValue, 10);

      return Number.isInteger(score)
        ? { criterionId: criterion.id, score }
        : null;
    })
    .filter((entry): entry is { criterionId: string; score: number } => Boolean(entry));

  const canSave = Boolean(verdict) && parsedScores.length === manualEval.criteria.length;
  const scorePreview = calculateScorePreview(
    manualEval.criteria,
    Object.fromEntries(parsedScores.map((entry) => [entry.criterionId, entry.score])),
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Run progress</CardTitle>
            <CardDescription>
              Review rows in order or jump directly to anything still pending.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
            <MetricCard label="Rows" value={String(run.metrics.totalRows)} />
            <MetricCard label="Reviewed" value={String(run.metrics.reviewedRows)} />
            <MetricCard label="Pending" value={String(run.metrics.pendingRows)} />
            <MetricCard
              label="Average score"
              value={
                run.metrics.overallAverageScore != null
                  ? run.metrics.overallAverageScore.toFixed(3)
                  : "n/a"
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rows</CardTitle>
            <CardDescription>Pick a row to inspect, score, and save.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {run.items.map((item) => (
              <button
                key={item.id}
                className={`w-full rounded-xl border p-3 text-left transition ${
                  item.id === currentItem.id
                    ? "border-cyan-400/40 bg-cyan-400/10"
                    : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
                }`}
                onClick={() => {
                  setError(null);
                  setMessage(null);
                  setSelectedItemId(item.id);
                }}
                type="button"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-100">Row {item.position}</p>
                    <p className="text-xs text-slate-400">
                      {item.row.source?.kind === "trace_export"
                        ? item.row.source.externalTraceId ?? item.row.source.traceId
                        : "Imported row"}
                    </p>
                  </div>
                  <Badge>{item.verdict ?? "pending"}</Badge>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CardTitle>Row {currentItem.position}</CardTitle>
                <Badge>{currentItem.verdict ?? "pending"}</Badge>
              </div>
              <CardDescription>
                Dataset row {currentItem.row.position} in manual eval{" "}
                <span className="font-medium text-slate-200">{manualEval.name}</span>
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={selectedIndex <= 0}
                onClick={() => setSelectedItemId(run.items[selectedIndex - 1]?.id ?? currentItem.id)}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={selectedIndex >= run.items.length - 1}
                onClick={() => setSelectedItemId(run.items[selectedIndex + 1]?.id ?? currentItem.id)}
              >
                Next
              </Button>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <PayloadCard title="Input" value={currentItem.row.input} />
            <PayloadCard title="Output" value={currentItem.row.output ?? null} emptyLabel="No output" />
            <PayloadCard title="Metadata" value={currentItem.row.metadata ?? null} emptyLabel="No metadata" />
            <Card className="border-slate-800 bg-slate-900/60">
              <CardHeader>
                <CardTitle className="text-base">Source</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-300">
                <Badge>{currentItem.row.source?.kind ?? "file_import"}</Badge>
                {currentItem.row.source?.traceId ? (
                  <Link
                    className="block text-cyan-300 hover:text-cyan-200"
                    href={`/traces/${currentItem.row.source.traceId}`}
                  >
                    Open source trace
                  </Link>
                ) : (
                  <p>Imported from a dataset file.</p>
                )}
                <p>Input retention: {currentItem.row.source?.inputRetentionMode ?? "n/a"}</p>
                <p>Output retention: {currentItem.row.source?.outputRetentionMode ?? "n/a"}</p>
              </CardContent>
            </Card>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reviewer workspace</CardTitle>
            <CardDescription>
              Save one canonical review for this row. Scores use a 1-5 scale.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {manualEval.reviewerInstructions ? (
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-300">
                {manualEval.reviewerInstructions}
              </div>
            ) : null}

            <div className="space-y-3">
              <Label>Verdict</Label>
              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant={verdict === "pass" ? "default" : "outline"}
                  onClick={() => setVerdict("pass")}
                >
                  Pass
                </Button>
                <Button
                  type="button"
                  variant={verdict === "fail" ? "default" : "outline"}
                  onClick={() => setVerdict("fail")}
                >
                  Fail
                </Button>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {manualEval.criteria.map((criterion) => (
                <div
                  key={criterion.id}
                  className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium">{criterion.label}</p>
                      <Badge>weight {criterion.weight}</Badge>
                    </div>
                    {criterion.description ? (
                      <p className="text-sm text-slate-400">{criterion.description}</p>
                    ) : null}
                    <select
                      className={selectClassName}
                      value={criterionScores[criterion.id] ?? ""}
                      onChange={(event) =>
                        setCriterionScores((current) => ({
                          ...current,
                          [criterion.id]: event.target.value,
                        }))
                      }
                    >
                      <option value="">Select score</option>
                      {scoreOptions.map((score) => (
                        <option key={score} value={String(score)}>
                          {score}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label htmlFor="manual-eval-row-notes">Notes</Label>
              <Textarea
                id="manual-eval-row-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Call out what made this row pass or fail, plus anything the team should fix next."
              />
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-300">
              <p>
                Score preview:{" "}
                <span className="font-medium text-slate-100">
                  {scorePreview != null ? scorePreview.toFixed(3) : "n/a"}
                </span>
              </p>
              {currentItem.reviewedAt ? (
                <p className="mt-2 text-slate-400">
                  Last reviewed at {new Date(currentItem.reviewedAt).toISOString()}
                </p>
              ) : null}
            </div>

            {error ? <p className="text-sm text-rose-300">{error}</p> : null}
            {message ? <p className="text-sm text-emerald-300">{message}</p> : null}

            <Button
              disabled={isPending || !canSave}
              onClick={() => {
                startTransition(async () => {
                  setError(null);
                  setMessage(null);

                  const response = await fetch(
                    `/api/projects/${projectId}/evals/${manualEval.id}/runs/${run.id}/items/${currentItem.id}`,
                    {
                      method: "PUT",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify({
                        verdict,
                        notes,
                        criterionScores: parsedScores,
                      }),
                    },
                  );

                  if (!response.ok) {
                    const payload = (await response.json().catch(() => null)) as
                      | { error?: string }
                      | null;
                    setError(payload?.error ?? "Could not save row review.");
                    return;
                  }

                  const payload = (await response.json()) as {
                    run: ManualEvalRun;
                  };
                  setRun(payload.run);
                  setMessage("Saved row review.");

                  const refreshedIndex = payload.run.items.findIndex(
                    (item) => item.id === currentItem.id,
                  );
                  const nextPending =
                    payload.run.items
                      .slice(refreshedIndex + 1)
                      .find((item) => !item.verdict) ??
                    payload.run.items.find((item) => !item.verdict);

                  setSelectedItemId(nextPending?.id ?? currentItem.id);
                });
              }}
            >
              {isPending ? "Saving..." : "Save review"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}

function PayloadCard({
  title,
  value,
  emptyLabel = "No value",
}: {
  title: string;
  value: JsonValue | null;
  emptyLabel?: string;
}) {
  return (
    <Card className="border-slate-800 bg-slate-900/60">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {value == null ? (
          <p className="text-sm text-slate-500">{emptyLabel}</p>
        ) : (
          <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-slate-200">
            {typeof value === "string" ? value : JSON.stringify(value, null, 2)}
          </pre>
        )}
      </CardContent>
    </Card>
  );
}

function calculateScorePreview(
  criteria: ManualEval["criteria"],
  scores: Record<string, number>,
) {
  let weightedTotal = 0;
  let totalWeight = 0;

  for (const criterion of criteria) {
    const score = scores[criterion.id];

    if (typeof score !== "number") {
      continue;
    }

    weightedTotal += score * criterion.weight;
    totalWeight += criterion.weight;
  }

  if (!totalWeight) {
    return null;
  }

  return Number((weightedTotal / totalWeight).toFixed(3));
}
