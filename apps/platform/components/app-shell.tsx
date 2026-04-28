import Link from 'next/link';
import { FolderKanban, PlugZap, ShieldCheck, Waypoints } from 'lucide-react';

import type { ReactNode } from 'react';

import { signOut } from '../auth';
import { appGradient } from '../lib/utils';
import { Button } from './ui/button';

const navItems = [{ href: '/projects', label: 'Projects', icon: FolderKanban }];

export function AppShell({
  userName,
  children,
}: {
  userName?: string | null;
  children: ReactNode;
}) {
  return (
    <div className={`min-h-screen ${appGradient} text-slate-100`}>
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 p-2 text-cyan-300">
              <Waypoints className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.18em] text-cyan-300/80">Captar</p>
              <h1 className="text-base font-semibold">Platform Control Plane</h1>
            </div>
          </div>
          <form
            action={async () => {
              'use server';
              await signOut({ redirectTo: '/login' });
            }}
            className="flex items-center gap-3"
          >
            <span className="text-sm text-slate-400">{userName ?? 'Signed in'}</span>
            <Button variant="secondary" size="sm" type="submit">
              Sign out
            </Button>
          </form>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-slate-200 transition hover:border-cyan-400/40 hover:text-cyan-200"
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}

          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-400">
            <div className="mb-3 flex items-center gap-2 text-slate-200">
              <ShieldCheck className="h-4 w-4 text-cyan-300" />
              Hook policies
            </div>
            Sync policy, ingest traces, and inspect spend, models, payloads, and violations per
            hook.
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-400">
            <div className="mb-3 flex items-center gap-2 text-slate-200">
              <PlugZap className="h-4 w-4 text-cyan-300" />
              SDK integration
            </div>
            Hook IDs attach directly to model calls and stream data into this control plane.
          </div>
        </aside>
        <main>{children}</main>
      </div>
    </div>
  );
}
