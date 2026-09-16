'use client';

import Link from 'next/link';

import { AlertTriangle, ArrowRight } from './icons';
import { Button } from './ui/button';

export function ErrorState({
  title = 'Could not load this view',
  message = 'Captar could not load this view. Try the request again. If the problem persists, use the reference below when reporting it.',
  reference,
  onRetry,
  fullScreen = false,
}: {
  title?: string;
  message?: string;
  reference?: string;
  onRetry: () => void;
  fullScreen?: boolean;
}) {
  return (
    <div
      className={
        fullScreen
          ? 'flex min-h-screen items-center justify-center bg-background p-6'
          : 'flex min-h-[50vh] items-center justify-center py-10'
      }
    >
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-white/[0.035] text-muted-foreground">
          <AlertTriangle className="h-4 w-4" />
        </span>
        <p className="mt-6 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          Request interrupted
        </p>
        <h2 className="mt-1.5 text-lg font-semibold tracking-[-0.02em]">{title}</h2>
        <p className="mt-2 text-sm leading-5 text-muted-foreground">{message}</p>
        {reference ? (
          <p className="mt-3 font-mono text-xs text-muted-foreground">
            Reference: <span className="text-foreground/80">{reference}</span>
          </p>
        ) : null}
        <div className="mt-5 flex flex-wrap gap-2">
          <Button onClick={onRetry}>Try again</Button>
          <Button variant="ghost" asChild>
            <Link href="/projects">
              Return to projects
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
