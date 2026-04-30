import { AppShell } from '../../../../../components/app-shell';
import { Skeleton } from '../../../../../components/ui/skeleton';

export default function EvalDetailLoading() {
  return (
    <AppShell>
      <div className="grid gap-6">
        <Skeleton className="h-6 w-72" />
        <Skeleton className="h-24 rounded-xl" />
        <div className="grid gap-4 md:grid-cols-4">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <Skeleton className="h-96 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    </AppShell>
  );
}
