import { AppShell } from '~/components/app-shell';
import { Skeleton } from '~/components/ui/skeleton';

export default function DatasetsLoading() {
  return (
    <AppShell>
      <div className="grid gap-6">
        <Skeleton className="h-6 w-64" />
        <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
          <div className="grid gap-4">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-24" />
          </div>
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    </AppShell>
  );
}
