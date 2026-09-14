import { AppShell } from '../../../../components/app-shell';
import { Skeleton } from '../../../../components/ui/skeleton';

export default function ProjectViolationsLoading() {
  return (
    <AppShell>
      <div className="grid gap-6">
        <Skeleton className="h-5 w-64 rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-36 w-full rounded-xl" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    </AppShell>
  );
}
