import { AppShell } from '../../../components/app-shell';
import { Skeleton } from '../../../components/ui/skeleton';

export default function ProjectDetailLoading() {
  return (
    <AppShell>
      <div className="grid gap-6">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-24 rounded-xl" />
        <div className="grid gap-4 md:grid-cols-5">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
          <Skeleton className="h-96 rounded-xl" />
          <div className="grid gap-4">
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
