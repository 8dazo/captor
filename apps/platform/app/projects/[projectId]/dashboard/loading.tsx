export default function DashboardLoading() {
  return (
    <div className="space-y-4 p-6">
      <div className="h-8 w-64 animate-pulse rounded bg-slate-800" />
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-lg border border-slate-800 bg-slate-900"
          />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-lg border border-slate-800 bg-slate-900" />
    </div>
  );
}
