'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';

type PortalProps = React.PropsWithChildren<{
  asChild?: boolean;
}>;

export function Portal({ children }: PortalProps): React.JSX.Element | null {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return createPortal(children, document.body);
}
