import { AppShell } from '../components/app-shell';
import { Skeleton } from '../components/ui/skeleton';

export default function RootLoading() {
  return (
    <AppShell>
      <div className="flex h-[60vh] items-center justify-center">
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
    </AppShell>
  );
}
