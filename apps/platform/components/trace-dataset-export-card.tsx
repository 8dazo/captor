'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

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
  const [datasetId, setDatasetId] = useState(datasets[0]?.id ?? '');
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
          <div className="rounded-xl border border-border bg-muted/50 p-4 text-sm text-foreground">
            <p>No datasets exist in this project yet.</p>
            <Link
              className="mt-3 inline-flex text-primary hover:text-primary/80"
              href={`/projects/${projectId}/datasets`}
            >
              Create your first dataset
            </Link>
          </div>
        ) : null}

        {disabledReason ? (
          <div className="rounded-xl border border-muted-foreground/30 bg-muted/50 p-4 text-sm text-muted-foreground">
            {disabledReason}
          </div>
        ) : null}

        {datasets.length ? (
          <div className="space-y-2">
            <Label htmlFor="trace-dataset-target">Dataset</Label>
            <Select value={datasetId} onValueChange={setDatasetId}>
              <SelectTrigger id="trace-dataset-target">
                <SelectValue placeholder="Select a dataset" />
              </SelectTrigger>
              <SelectContent>
                {datasets.map((dataset) => (
                  <SelectItem key={dataset.id} value={dataset.id}>
                    {dataset.name} ({dataset.rowCount} rows)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <Button
          disabled={isPending || isDisabled || !datasetId}
          onClick={() => {
            startTransition(async () => {
              setError(null);

              const response = await fetch(
                `/api/projects/${projectId}/datasets/${datasetId}/trace-export`,
                {
                  method: 'POST',
                  headers: { 'content-type': 'application/json' },
                  body: JSON.stringify({ traceId }),
                }
              );

              if (!response.ok) {
                const payload = (await response.json().catch(() => null)) as {
                  error?: string;
                } | null;
                setError(payload?.error ?? 'Could not export trace to dataset.');
                return;
              }

              router.push(`/projects/${projectId}/datasets/${datasetId}`);
              router.refresh();
            });
          }}
        >
          {isPending ? 'Exporting...' : 'Export trace'}
        </Button>
      </CardContent>
    </Card>
  );
}
