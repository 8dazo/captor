import { AppShell } from '../../../../components/app-shell';
import { Skeleton } from '../../../../components/ui/skeleton';

export default function DashboardLoading() {
  return (
    <AppShell>
      <div className="grid gap-6">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-24 rounded-xl" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </AppShell>
  );
}
