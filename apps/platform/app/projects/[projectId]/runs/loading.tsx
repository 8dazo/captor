import { Skeleton } from '../../../../components/ui/skeleton';

export default function RunsLoading() {
  return (
    <div className="space-y-5 p-6 md:ml-60" role="status" aria-label="Loading runs">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-10 w-full" />
      {Array.from({ length: 6 }, (_, index) => (
        <Skeleton key={index} className="h-14 w-full" />
      ))}
    </div>
  );
}
