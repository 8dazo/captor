import * as React from 'react';

import { cn } from '~/lib/utils';

export function Logo({
  className
}: {
  className?: string;
} = {}): React.JSX.Element {
  return (
    <div className={cn('flex items-center gap-2 text-foreground', className)}>
      <div className="flex size-8 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-sm">
        C
      </div>
      <div className="flex flex-col leading-none">
        <span className="text-base font-semibold tracking-tight">Captar</span>
        <span className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          Runtime control
        </span>
      </div>
    </div>
  );
}
