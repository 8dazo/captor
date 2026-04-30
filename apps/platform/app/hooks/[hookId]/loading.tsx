import { AppShell } from '../../../components/app-shell';
import { Skeleton } from '../../../components/ui/skeleton';

export default function HookDetailLoading() {
  return (
    <AppShell>
      <div className="grid gap-6">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-24 rounded-xl" />
        <div className="grid gap-4 md:grid-cols-4">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    </AppShell>
  );
}
