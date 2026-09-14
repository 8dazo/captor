'use client';

import Link from 'next/link';

import { AlertTriangle, ArrowRight } from './icons';
import { Button } from './ui/button';

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  fullScreen = false,
}: {
  title?: string;
  message: string;
  onRetry: () => void;
  fullScreen?: boolean;
}) {
  return (
    <div
      className={
        fullScreen
          ? 'platform-grid flex min-h-screen items-center justify-center p-6'
          : 'flex min-h-[55vh] items-center justify-center p-6'
      }
    >
      <div className="w-full max-w-md rounded-xl border border-white/[0.08] bg-card p-6 shadow-2xl shadow-black/30">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.05]">
          <AlertTriangle className="h-5 w-5" />
        </span>
        <p className="mt-8 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Request interrupted
        </p>
        <h2 className="mt-2 text-xl font-semibold tracking-[-0.025em]">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{message}</p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button onClick={onRetry}>Try again</Button>
          <Button variant="outline" asChild>
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
