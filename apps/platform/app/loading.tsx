import { AppShell } from '~/components/app-shell';
import { Skeleton } from '~/components/ui/skeleton';

export default function RootLoading() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div className="space-y-2 border-b border-border pb-5">
          <Skeleton className="h-7 w-44" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-20 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-10 w-full max-w-sm" />
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="border-b border-border px-4 py-3 last:border-b-0">
              <Skeleton className="h-4 w-full max-w-xl" />
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
