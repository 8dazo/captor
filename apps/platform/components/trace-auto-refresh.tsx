'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function TraceAutoRefresh({
  active,
  intervalMs = 4_000,
}: {
  active: boolean;
  intervalMs?: number;
}) {
  const router = useRouter();

  useEffect(() => {
    if (!active) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        router.refresh();
      }
    }, intervalMs);

    return () => {
      window.clearInterval(interval);
    };
  }, [active, intervalMs, router]);

  if (!active) {
    return null;
  }

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/10 p-3 text-sm text-primary-foreground">
      Live trace polling is enabled while spans are still running.
    </div>
  );
}
