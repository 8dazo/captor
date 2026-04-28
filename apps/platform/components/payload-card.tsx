import { cn } from '../lib/utils';

interface PayloadCardProps {
  label: string;
  data: unknown;
  className?: string;
}

export function PayloadCard({ label, data, className }: PayloadCardProps) {
  if (data === null || data === undefined) {
    return (
      <div className={cn('space-y-1', className)}>
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="text-sm text-slate-600">—</p>
      </div>
    );
  }
  return (
    <div className={cn('space-y-1', className)}>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <pre className="max-h-64 overflow-auto rounded-md bg-slate-900 p-3 text-xs text-slate-300">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
