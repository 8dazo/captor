import * as React from 'react';

import { cn } from '../../lib/utils';

export function Badge({ className, children, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={cn(badgeVariants(), className)} {...props}>
      {children}
    </span>
  );
}
