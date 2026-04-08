"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { DatasetFileFormat } from "@captar/types";

import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Label } from "./ui/label";

const selectClassName =
  "flex h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300";

export function DatasetImportForm({
  projectId,
  datasetId,
}: {
  projectId: string;
  datasetId: string;
}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<DatasetFileFormat | "auto">("auto");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import rows</CardTitle>
        <CardDescription>
          Append rows from a `json`, `jsonl`, or `csv` file into this dataset.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="dataset-import-file">File</Label>
          <input
            id="dataset-import-file"
            type="file"
            accept=".json,.jsonl,.csv,application/json,text/csv,application/x-ndjson"
            className="block w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 file:mr-4 file:rounded-md file:border-0 file:bg-cyan-400/10 file:px-3 file:py-2 file:text-sm file:font-medium file:text-cyan-200"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dataset-import-format">Format</Label>
          <select
            id="dataset-import-format"
            className={selectClassName}
            value={format}
            onChange={(event) =>
              setFormat(event.target.value as DatasetFileFormat | "auto")
            }
          >
            <option value="auto">Detect from file name</option>
            <option value="json">JSON</option>
            <option value="jsonl">JSONL</option>
            <option value="csv">CSV</option>
          </select>
        </div>
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
        <Button
          disabled={isPending || !file}
          onClick={() => {
            startTransition(async () => {
              if (!file) {
                return;
              }

              setError(null);
              setMessage(null);

              const body = new FormData();
              body.set("file", file);
              if (format !== "auto") {
                body.set("format", format);
              }

              const response = await fetch(
                `/api/projects/${projectId}/datasets/${datasetId}/import`,
                {
                  method: "POST",
                  body,
                },
              );

              if (!response.ok) {
                const payload = (await response.json().catch(() => null)) as
                  | { error?: string }
                  | null;
                setError(payload?.error ?? "Could not import dataset rows.");
                return;
              }

              const payload = (await response.json()) as {
                appendedCount: number;
              };
              setMessage(`Imported ${payload.appendedCount} row(s).`);
              router.refresh();
            });
          }}
        >
          {isPending ? "Importing..." : "Import rows"}
        </Button>
      </CardContent>
    </Card>
  );
}
