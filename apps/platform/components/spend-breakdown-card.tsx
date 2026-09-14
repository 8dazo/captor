import Link from 'next/link';

import type { SpendBreakdownRow } from '../lib/spend-analytics';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(value);
}

function formatPercent(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    maximumFractionDigits: 1,
  }).format(value);
}

export function SpendBreakdownCard({
  title,
  description,
  rows,
  projectId,
  filterKey,
}: {
  title: string;
  description: string;
  rows: SpendBreakdownRow[];
  projectId: string;
  filterKey: 'provider' | 'model';
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{filterKey === 'provider' ? 'Provider' : 'Model'}</TableHead>
                <TableHead className="text-right">Traces</TableHead>
                <TableHead className="text-right">Actual cost</TableHead>
                <TableHead className="text-right">Share</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const label = row.filterValue ? (
                  <Link
                    href={`/projects/${projectId}/traces?${filterKey}=${encodeURIComponent(row.filterValue)}`}
                    className="font-medium text-primary hover:text-primary/80"
                  >
                    {row.label}
                  </Link>
                ) : (
                  <span className="font-medium">{row.label}</span>
                );

                return (
                  <TableRow key={`${filterKey}-${row.label}`}>
                    <TableCell className="max-w-64 truncate">{label}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.traceCount}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatCurrency(row.actualCostUsd)}
                    </TableCell>
                    <TableCell className="min-w-28 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="h-1.5 w-14 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${Math.min(100, Math.max(0, row.share * 100))}%` }}
                          />
                        </div>
                        <span className="w-12 text-xs tabular-nums text-muted-foreground">
                          {formatPercent(row.share)}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
            No trace spend recorded in this period yet.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
