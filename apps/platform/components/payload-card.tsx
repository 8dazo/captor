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
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-sm text-muted-foreground/60">—</p>
      </div>
    );
  }
  return (
    <div className={cn('space-y-1', className)}>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <pre className="max-h-64 overflow-auto rounded-lg border border-white/[0.06] bg-black/50 p-3 text-xs text-foreground/80">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
