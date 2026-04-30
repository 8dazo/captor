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
        'rounded-xl border border-border bg-card p-4',
        'transition-colors',
        variant === 'primary' && 'hover:border-primary/40',
        variant === 'success' && 'hover:border-emerald-500/40',
        className
      )}
    >
      {(icon || label) && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {icon}
          {label && <span>{label}</span>}
        </div>
      )}
      <div
        className={cn(
          'mt-1 text-2xl font-semibold',
          variant === 'primary' && 'text-primary',
          variant === 'success' && 'text-emerald-400'
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
