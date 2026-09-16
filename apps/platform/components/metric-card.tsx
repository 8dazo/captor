import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '../lib/utils';

interface MetricCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  href?: string;
  variant?: 'default' | 'primary' | 'success';
  className?: string;
}

export function MetricCard({
  label,
  value,
  icon,
  href,
  variant = 'default',
  className,
}: MetricCardProps) {
  const card = (
    <div
      className={cn(
        'rounded-[10px] border border-border bg-card p-4',
        href && 'transition-colors hover:border-white/20 hover:bg-white/[0.035]',
        variant === 'success' && 'border-emerald-500/15',
        className
      )}
    >
      {(icon || label) && (
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          {icon ? <span className="text-foreground/70">{icon}</span> : null}
          {label ? <span>{label}</span> : null}
        </div>
      )}
      <div
        className={cn(
          'mt-2.5 text-2xl font-semibold tracking-[-0.035em] tabular-nums',
          variant === 'primary' && 'text-foreground',
          variant === 'success' && 'text-emerald-300'
        )}
      >
        {value}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {card}
      </Link>
    );
  }

  return card;
}
