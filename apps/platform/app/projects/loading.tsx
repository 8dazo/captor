import { AppShell } from '~/components/app-shell';
import { Skeleton } from '~/components/ui/skeleton';

export default function ProjectsLoading() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-end justify-between gap-4 border-b border-border pb-5">
          <div className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-28" />
            <Skeleton className="h-4 w-80 max-w-full" />
          </div>
          <Skeleton className="h-9 w-28" />
        </div>
        <Skeleton className="h-10 w-full max-w-sm" />
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <Skeleton className="h-3 w-full max-w-md" />
          </div>
          <div className="divide-y divide-border">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="grid gap-3 px-4 py-3.5 sm:grid-cols-[minmax(0,1fr)_120px_120px_32px] sm:items-center sm:gap-4"
              >
                <div className="space-y-2">
                  <Skeleton className="h-4 w-44 max-w-full" />
                  <Skeleton className="h-3 w-28 max-w-full" />
                </div>
                <Skeleton className="h-4 w-10 sm:justify-self-end" />
                <Skeleton className="h-4 w-10 sm:justify-self-end" />
                <Skeleton className="hidden h-4 w-4 sm:block" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
