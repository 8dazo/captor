import Link from 'next/link';

import type { ReactNode } from 'react';

import { signOut } from '../auth';
import { AppNavigation } from './app-navigation';
import { LogOut, ShieldCheck, Waypoints } from './icons';
import { Button } from './ui/button';

export function AppShell({
  userName,
  children,
}: {
  userName?: string | null;
  children: ReactNode;
}) {
  const initial = userName?.charAt(0).toUpperCase() ?? 'C';

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-white/[0.07] bg-[#070707] md:flex">
        <div className="flex h-16 items-center border-b border-white/[0.07] px-5">
          <Link href="/projects" className="flex items-center gap-3" aria-label="Captar projects">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-black">
              <Waypoints className="h-[18px] w-[18px]" />
            </span>
            <span>
              <span className="block text-sm font-semibold tracking-tight">Captar</span>
              <span className="block text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                Control plane
              </span>
            </span>
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-5">
          <AppNavigation />
        </div>

        <div className="border-t border-white/[0.07] p-3">
          <div className="mb-3 rounded-lg border border-white/[0.07] bg-white/[0.025] p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-foreground">
              <ShieldCheck className="h-4 w-4" />
              Runtime protection active
            </div>
            <p className="text-[11px] leading-4 text-muted-foreground">
              Policies run before requests leave your server.
            </p>
          </div>
          <form
            action={async () => {
              'use server';
              await signOut({ redirectTo: '/login' });
            }}
            className="flex items-center gap-2"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-xs font-semibold">
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

      <div className="min-h-screen md:pl-64">
        <header className="sticky top-0 z-30 border-b border-white/[0.07] bg-background/85 backdrop-blur-xl">
          <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <Link href="/projects" className="flex items-center gap-2 md:hidden">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-black">
                <Waypoints className="h-[18px] w-[18px]" />
              </span>
              <span className="text-sm font-semibold">Captar</span>
            </Link>
            <div className="hidden items-center gap-2 text-xs text-muted-foreground md:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-white/70" />
              All systems operational
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground md:hidden">
              <span className="h-1.5 w-1.5 rounded-full bg-white/70" />
              Operational
            </div>
          </div>
          <div className="overflow-x-auto border-t border-white/[0.05] px-3 py-2 md:hidden">
            <AppNavigation compact />
          </div>
        </header>
        <main className="platform-grid min-h-[calc(100vh-4rem)]">
          <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
