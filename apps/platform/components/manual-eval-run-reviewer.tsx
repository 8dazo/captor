'use client';

import Link from 'next/link';
import { useEffect, useState, useTransition } from 'react';

import type { ManualEval, ManualEvalRun, ManualEvalVerdict } from '@captar/types';

import {
  calculateManualEvalDraftScore,
  getNextPendingManualEvalItemId,
} from '../lib/manual-eval-run-workspace';
import { formatTimestamp } from '../lib/utils';
import { MetricCard } from './metric-card';
import { PayloadCard } from './payload-card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner';

const scoreOptions = [1, 2, 3, 4, 5];

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
  const [selectedItemId, setSelectedItemId] = useState(initialRun.items[0]?.id ?? '');
  const [verdict, setVerdict] = useState<ManualEvalVerdict | ''>('');
  const [notes, setNotes] = useState('');
  const [criterionScores, setCriterionScores] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  const selectedIndex = Math.max(
    run.items.findIndex((item) => item.id === selectedItemId),
    0
  );
  const currentItem = run.items[selectedIndex];

  useEffect(() => {
    if (!currentItem) {
      return;
    }

    setVerdict(currentItem.verdict ?? '');
    setNotes(currentItem.notes ?? '');
    setCriterionScores(
      Object.fromEntries(
        manualEval.criteria.map((criterion) => [
          criterion.id,
          String(
            currentItem.criterionScores.find((entry) => entry.criterionId === criterion.id)
              ?.score ?? ''
          ),
        ])
      )
    );
  }, [currentItem, manualEval.criteria]);

  if (!currentItem) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Run items</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">This run has no dataset rows to review.</p>
        </CardContent>
      </Card>
    );
  }

  const parsedScores = manualEval.criteria
    .map((criterion) => {
      const rawValue = criterionScores[criterion.id] ?? '';
      const score = Number.parseInt(rawValue, 10);

      return Number.isInteger(score) ? { criterionId: criterion.id, score } : null;
    })
    .filter((entry): entry is { criterionId: string; score: number } => Boolean(entry));

  const canSave = Boolean(verdict) && parsedScores.length === manualEval.criteria.length;
  const scorePreview = calculateManualEvalDraftScore(
    manualEval.criteria,
    Object.fromEntries(parsedScores.map((entry) => [entry.criterionId, entry.score]))
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
                  : 'n/a'
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
                    ? 'border-primary/40 bg-primary/10'
                    : 'border-border bg-card hover:border-muted-foreground'
                }`}
                onClick={() => setSelectedItemId(item.id)}
                type="button"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-card-foreground">Row {item.position}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.row.source?.kind === 'trace_export'
                        ? (item.row.source.externalTraceId ?? item.row.source.traceId)
                        : 'Imported row'}
                    </p>
                  </div>
                  <Badge>{item.verdict ?? 'pending'}</Badge>
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
                <Badge>{currentItem.verdict ?? 'pending'}</Badge>
              </div>
              <CardDescription>
                Dataset row {currentItem.row.position} in manual eval{' '}
                <span className="font-medium text-card-foreground">{manualEval.name}</span>
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={selectedIndex <= 0}
                onClick={() =>
                  setSelectedItemId(run.items[selectedIndex - 1]?.id ?? currentItem.id)
                }
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={selectedIndex >= run.items.length - 1}
                onClick={() =>
                  setSelectedItemId(run.items[selectedIndex + 1]?.id ?? currentItem.id)
                }
              >
                Next
              </Button>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <PayloadCard label="Input" data={currentItem.row.input} />
            <PayloadCard label="Output" data={currentItem.row.output ?? null} />
            <PayloadCard label="Metadata" data={currentItem.row.metadata ?? null} />
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-base">Source</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <Badge>{currentItem.row.source?.kind ?? 'file_import'}</Badge>
                {currentItem.row.source?.traceId ? (
                  <Link
                    className="block text-primary hover:text-primary/80"
                    href={`/traces/${currentItem.row.source.traceId}`}
                  >
                    Open source trace
                  </Link>
                ) : (
                  <p>Imported from a dataset file.</p>
                )}
                <p>Input retention: {currentItem.row.source?.inputRetentionMode ?? 'n/a'}</p>
                <p>Output retention: {currentItem.row.source?.outputRetentionMode ?? 'n/a'}</p>
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
              <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
                {manualEval.reviewerInstructions}
              </div>
            ) : null}

            <div className="space-y-3">
              <Label>Verdict</Label>
              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant={verdict === 'pass' ? 'default' : 'outline'}
                  onClick={() => setVerdict('pass')}
                >
                  Pass
                </Button>
                <Button
                  type="button"
                  variant={verdict === 'fail' ? 'destructive' : 'outline'}
                  onClick={() => setVerdict('fail')}
                >
                  Fail
                </Button>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {manualEval.criteria.map((criterion) => (
                <div key={criterion.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium">{criterion.label}</p>
                      <Badge>weight {criterion.weight}</Badge>
                    </div>
                    {criterion.description ? (
                      <p className="text-sm text-muted-foreground">{criterion.description}</p>
                    ) : null}
                    <Select
                      value={criterionScores[criterion.id] ?? ''}
                      onValueChange={(value) =>
                        setCriterionScores((current) => ({
                          ...current,
                          [criterion.id]: value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select score" />
                      </SelectTrigger>
                      <SelectContent>
                        {scoreOptions.map((score) => (
                          <SelectItem key={score} value={String(score)}>
                            {score}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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

            <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
              <p>
                Score preview:{' '}
                <span className="font-medium text-card-foreground">
                  {scorePreview != null ? scorePreview.toFixed(3) : 'n/a'}
                </span>
              </p>
              {currentItem.reviewedAt ? (
                <p className="mt-2 text-muted-foreground">
                  Last reviewed at {formatTimestamp(currentItem.reviewedAt)}
                </p>
              ) : null}
            </div>

            <Button
              disabled={isPending || !canSave}
              onClick={() => {
                startTransition(async () => {
                  const response = await fetch(
                    `/api/projects/${projectId}/evals/${manualEval.id}/runs/${run.id}/items/${currentItem.id}`,
                    {
                      method: 'PUT',
                      headers: { 'content-type': 'application/json' },
                      body: JSON.stringify({
                        verdict,
                        notes,
                        criterionScores: parsedScores,
                      }),
                    }
                  );

                  if (!response.ok) {
                    const payload = (await response.json().catch(() => null)) as {
                      error?: string;
                    } | null;
                    toast.error(payload?.error ?? 'Could not save row review.');
                    return;
                  }

                  const payload = (await response.json()) as {
                    run: ManualEvalRun;
                  };
                  setRun(payload.run);
                  toast.success('Saved row review.');
                  setSelectedItemId(
                    getNextPendingManualEvalItemId(payload.run.items, currentItem.id)
                  );
                });
              }}
            >
              {isPending ? 'Saving...' : 'Save review'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
