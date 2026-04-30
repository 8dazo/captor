import './globals.css';

import type { ReactNode } from 'react';
import { Providers } from './providers';
import { Toaster } from '~/components/ui/sonner';

export const metadata = {
  title: 'Captar Platform',
  description: 'Authenticated hook-connected control plane for Captar.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
