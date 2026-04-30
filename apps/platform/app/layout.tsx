import './globals.css';

import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import { Providers } from './providers';
import { Toaster } from '~/components/ui/sonner';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: 'black',
};

export const metadata: Metadata = {
  title: {
    template: '%s | Captar',
    default: 'Captar',
  },
  description: 'Authenticated hook-connected control plane for Captar.',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-icon.png',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Captar',
    title: 'Captar',
    description: 'Authenticated control plane for Captar.',
    images: {
      url: '/icon.png',
      width: 1200,
      height: 630,
      alt: 'Captar',
    },
  },
  robots: {
    index: false,
    follow: false,
  },
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
