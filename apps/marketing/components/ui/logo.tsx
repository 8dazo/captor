import * as React from 'react';
import Image from 'next/image';

import { cn } from '~/lib/utils';

export function Logo({
  className,
  showWordmark = true
}: {
  className?: string;
  showWordmark?: boolean;
} = {}): React.JSX.Element {
  return (
    <div className={cn('flex items-center gap-2 text-foreground', className)}>
      <Image
        src="/logo.png"
        alt="Captar"
        width={32}
        height={32}
        className="size-8 rounded-xl object-contain"
      />
      {showWordmark && (
        <div className="flex flex-col leading-none">
          <span className="text-base font-semibold tracking-tight">Captar</span>
          <span className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            Runtime control
          </span>
        </div>
      )}
    </div>
  );
}
