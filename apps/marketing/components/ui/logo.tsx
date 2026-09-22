import * as React from 'react';
import Image from 'next/image';

import { cn } from '~/lib/utils';

export function Logo({
  className,
  showWordmark = true,
}: {
  className?: string;
  showWordmark?: boolean;
} = {}): React.JSX.Element {
  return (
    <div className={cn('flex items-center gap-2 text-foreground', className)}>
      <Image
        src="/logo.png"
        alt="Captor"
        width={32}
        height={32}
        priority
        className="size-8 rounded-lg bg-neutral-950 p-1.5 object-contain ring-1 ring-border"
      />
      {showWordmark && (
        <div className="flex flex-col leading-none">
          <span className="text-base font-semibold tracking-tight">Captor</span>
          <span className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            Runtime control
          </span>
        </div>
      )}
    </div>
  );
}
