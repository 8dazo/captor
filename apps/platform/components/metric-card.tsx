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
        'group rounded-xl border border-white/[0.08] bg-card p-5',
        'transition-all hover:-translate-y-0.5 hover:border-white/[0.16] hover:bg-white/[0.045]',
        className
      )}
    >
      {(icon || label) && (
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          {icon ? <span className="text-foreground/70">{icon}</span> : null}
          {label && <span>{label}</span>}
        </div>
      )}
      <div
        className={cn(
          'mt-3 text-2xl font-semibold tracking-[-0.035em]',
          variant === 'primary' && 'text-foreground',
          variant === 'success' && 'text-foreground'
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
