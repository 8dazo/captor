import { cn } from '../lib/utils';

interface MetricCardProps {
  label: string;
  value: string | number;
  className?: string;
}

export function MetricCard({ label, value, className }: MetricCardProps) {
  return (
    <div className={cn('rounded-lg border border-slate-800 bg-slate-950 p-4', className)}>
      <p className="text-sm text-slate-400">{label}</p>
      <p className="text-xl font-semibold text-slate-100">{value}</p>
    </div>
  );
}
