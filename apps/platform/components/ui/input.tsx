import * as React from 'react';

import { cn } from '../../lib/utils';

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      'flex h-10 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-foreground shadow-inner shadow-black/20 placeholder:text-muted-foreground/70 focus-visible:border-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/10',
      className
    )}
    {...props}
  />
));
Input.displayName = 'Input';
