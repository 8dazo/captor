"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Label } from "./ui/label";

const selectClassName =
  "flex h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300";

export function TraceDatasetExportCard({
  projectId,
  traceId,
  datasets,
  disabledReason,
}: {
  projectId: string;
  traceId: string;
  datasets: Array<{
    id: string;
    name: string;
    rowCount: number;
  }>;
  disabledReason?: string;
}) {
  const router = useRouter();
  const [datasetId, setDatasetId] = useState(datasets[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isDisabled = Boolean(disabledReason) || !datasets.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Export to dataset</CardTitle>
        <CardDescription>
          Turn this trace into an append-only dataset row for later review and eval prep.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!datasets.length ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-300">
            <p>No datasets exist in this project yet.</p>
            <Link
              className="mt-3 inline-flex text-cyan-300 hover:text-cyan-200"
              href={`/projects/${projectId}/datasets`}
            >
              Create your first dataset
            </Link>
          </div>
        ) : null}

        {disabledReason ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
            {disabledReason}
          </div>
        ) : null}

        {datasets.length ? (
          <div className="space-y-2">
            <Label htmlFor="trace-dataset-target">Dataset</Label>
            <select
              id="trace-dataset-target"
              className={selectClassName}
              value={datasetId}
              onChange={(event) => setDatasetId(event.target.value)}
            >
              {datasets.map((dataset) => (
                <option key={dataset.id} value={dataset.id}>
                  {dataset.name} ({dataset.rowCount} rows)
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {error ? <p className="text-sm text-rose-300">{error}</p> : null}

        <Button
          disabled={isPending || isDisabled || !datasetId}
          onClick={() => {
            startTransition(async () => {
              setError(null);

              const response = await fetch(
                `/api/projects/${projectId}/datasets/${datasetId}/trace-export`,
                {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ traceId }),
                },
              );

              if (!response.ok) {
                const payload = (await response.json().catch(() => null)) as
                  | { error?: string }
                  | null;
                setError(payload?.error ?? "Could not export trace to dataset.");
                return;
              }

              router.push(`/projects/${projectId}/datasets/${datasetId}`);
              router.refresh();
            });
          }}
        >
          {isPending ? "Exporting..." : "Export trace"}
        </Button>
      </CardContent>
    </Card>
  );
}
