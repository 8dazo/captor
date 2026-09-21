'use client';

import { useState, useTransition } from 'react';
import { importRunReceipts } from '../app/projects/[projectId]/runs/actions';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';

export function ReceiptImport({ projectId }: { projectId: string }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ error?: string; message?: string }>({});
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Import receipts</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import execution receipts</DialogTitle>
          <DialogDescription>
            Choose a JSON receipt or a JSONL history file produced by Captor. Imported snapshots are
            visible to this project’s members.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          action={(form) => {
            setResult({});
            startTransition(async () => {
              try {
                setResult(await importRunReceipts(projectId, form));
              } catch {
                setResult({ error: 'Import interrupted. Please try again.' });
              }
            });
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="receipt-file">Receipt file</Label>
            <Input
              id="receipt-file"
              name="file"
              type="file"
              accept=".json,.jsonl,application/json"
              required
              disabled={pending}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Up to 512 KB and 200 receipts. Existing run IDs are skipped. Review checkpoint contents
            before sharing; imports retain the complete receipt.
          </p>
          {result.error && (
            <p role="alert" className="text-sm text-red-400">
              {result.error}
            </p>
          )}
          {result.message && (
            <p role="status" className="text-sm">
              {result.message}
            </p>
          )}
          <Button type="submit" disabled={pending}>
            {pending ? 'Importing…' : 'Import into project'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
