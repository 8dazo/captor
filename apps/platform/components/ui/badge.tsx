import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../../lib/utils';

const badgeVariants = cva('inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium', {
  variants: {
    variant: {
      default: 'bg-cyan-400/15 text-cyan-400',
      secondary: 'bg-slate-800 text-slate-300',
      outline: 'border border-slate-700 text-slate-300',
      status_completed:
        'border-emerald-500/30 bg-emerald-950/20 text-emerald-300 rounded-full border',
      status_failed: 'border-rose-500/30 bg-rose-950/20 text-rose-300 rounded-full border',
      status_blocked: 'border-amber-500/30 bg-amber-950/20 text-amber-300 rounded-full border',
      status_pending: 'border-border bg-secondary text-secondary-foreground rounded-full border',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
