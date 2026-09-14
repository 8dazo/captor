import '@workspace/ui/globals.css';

import * as React from 'react';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';

import { APP_DESCRIPTION, APP_NAME } from '@workspace/common/app';
import { baseUrl } from '@workspace/routes';
import { Toaster } from '@workspace/ui/components/sonner';

import { Footer } from '~/components/footer';
import { CookieBanner } from '~/components/fragments/cookie-banner';
import { Navbar } from '~/components/navbar';
import { Providers } from './providers';

const defaultOgImage = `${baseUrl.Marketing}/og-image?variant=home`;

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' }
  ]
};

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl.Marketing),
  title: APP_NAME,
  description: APP_DESCRIPTION,
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png'
  },
  manifest: `${baseUrl.Marketing}/manifest`,
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: APP_NAME,
    title: APP_NAME,
    description: APP_DESCRIPTION,
    url: baseUrl.Marketing,
    images: {
      url: defaultOgImage,
      width: 1200,
      height: 630,
      alt: `${APP_NAME} — ${APP_DESCRIPTION}`
    }
  },
  twitter: {
    card: 'summary_large_image',
    title: APP_NAME,
    description: APP_DESCRIPTION,
    images: [defaultOgImage]
  },
  robots: {
    index: true,
    follow: true
  }
};

const inter = Inter({ subsets: ['latin'] });

export default async function RootLayout({
  children
}: React.PropsWithChildren): Promise<React.JSX.Element> {
  return (
    <html
      lang="en"
      className="size-full min-h-screen"
      suppressHydrationWarning
    >
      <body className={`${inter.className} size-full`}>
        <Providers>
          <div>
            <Navbar />
            {children}
            <Footer />
            <CookieBanner />
          </div>
          <React.Suspense>
            <Toaster />
          </React.Suspense>
        </Providers>
      </body>
    </html>
  );
}
