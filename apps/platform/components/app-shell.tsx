import Image from 'next/image';
import Link from 'next/link';

import type { ReactNode } from 'react';

import { signOut } from '../auth';
import { AppNavigation } from './app-navigation';
import { LogOut } from './icons';
import { Button } from './ui/button';

function BrandMark() {
  return (
    <Image
      src="/icon.png"
      alt=""
      width={32}
      height={32}
      priority
      className="h-8 w-8 rounded-lg object-contain"
    />
  );
}

export function AppShell({
  userName,
  projectId,
  children,
}: {
  userName?: string | null;
  projectId?: string;
  children: ReactNode;
}) {
  const initial = userName?.charAt(0).toUpperCase() ?? 'C';

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-border bg-[#101010] md:flex">
        <div className="flex h-14 items-center px-4">
          <Link href="/projects" className="flex items-center gap-2.5" aria-label="Captar projects">
            <BrandMark />
            <span className="text-sm font-semibold tracking-[-0.015em]">Captar</span>
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto px-2.5 py-3">
          <AppNavigation projectId={projectId} />
        </div>

        <div className="border-t border-border p-2.5">
          <form
            action={async () => {
              'use server';
              await signOut({ redirectTo: '/login' });
            }}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-white/[0.04] text-xs font-semibold">
              {initial}
            </span>
            <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
              {userName ?? 'Signed in'}
            </span>
            <Button variant="ghost" size="icon" type="submit" aria-label="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </aside>

      <div className="min-h-screen md:pl-60">
        <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur md:hidden">
          <div className="flex h-14 items-center px-4">
            <Link href="/projects" className="flex items-center gap-2.5" aria-label="Captar projects">
              <BrandMark />
              <span className="text-sm font-semibold tracking-[-0.015em]">Captar</span>
            </Link>
          </div>
          <div className="overflow-x-auto border-t border-border px-2.5 py-2">
            <AppNavigation compact projectId={projectId} />
          </div>
        </header>

        <main className="min-h-screen bg-background">
          <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-7">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
