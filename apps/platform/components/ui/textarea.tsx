import * as React from 'react';

import { cn } from '../../lib/utils';

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'min-h-[120px] w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-foreground shadow-inner shadow-black/20 placeholder:text-muted-foreground/70 focus-visible:border-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/10',
      className
    )}
    {...props}
  />
));
Textarea.displayName = 'Textarea';
