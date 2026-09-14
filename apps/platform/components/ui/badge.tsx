import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium',
  {
    variants: {
      variant: {
        default: 'border-white/10 bg-white/[0.07] text-foreground',
        secondary: 'border-white/[0.07] bg-white/[0.04] text-muted-foreground',
        outline: 'border-white/10 bg-transparent text-muted-foreground',
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
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
