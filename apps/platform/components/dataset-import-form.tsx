'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import type { DatasetFileFormat } from '@captar/types';

import { toast } from 'sonner';

import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { FileUpload } from './file-upload';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

export function DatasetImportForm({
  projectId,
  datasetId,
}: {
  projectId: string;
  datasetId: string;
}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<DatasetFileFormat | 'auto'>('auto');
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
          <FileUpload
            id="dataset-import-file"
            accept=".json,.jsonl,.csv,application/json,text/csv,application/x-ndjson"
            onChange={setFile}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dataset-import-format">Format</Label>
          <Select
            value={format}
            onValueChange={(value) => setFormat(value as DatasetFileFormat | 'auto')}
          >
            <SelectTrigger id="dataset-import-format" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Detect from file name</SelectItem>
              <SelectItem value="json">JSON</SelectItem>
              <SelectItem value="jsonl">JSONL</SelectItem>
              <SelectItem value="csv">CSV</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          disabled={isPending || !file}
          onClick={() => {
            startTransition(async () => {
              if (!file) {
                return;
              }

              const body = new FormData();
              body.set('file', file);
              if (format !== 'auto') {
                body.set('format', format);
              }

              const response = await fetch(
                `/api/projects/${projectId}/datasets/${datasetId}/import`,
                {
                  method: 'POST',
                  body,
                }
              );

              if (!response.ok) {
                const payload = (await response.json().catch(() => null)) as {
                  error?: string;
                } | null;
                toast.error(payload?.error ?? 'Could not import dataset rows.');
                return;
              }

              const payload = (await response.json()) as {
                appendedCount: number;
              };
              toast.success(`Imported ${payload.appendedCount} row(s).`);
              router.refresh();
            });
          }}
        >
          {isPending ? 'Importing...' : 'Import rows'}
        </Button>
      </CardContent>
    </Card>
  );
}
