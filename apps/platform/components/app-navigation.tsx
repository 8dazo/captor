'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Activity, Database, FolderKanban, LayoutDashboard, LineChart, ShieldAlert } from './icons';
import { cn } from '../lib/utils';

const rootItems = [{ href: '/projects', label: 'Projects', icon: FolderKanban }];

export function AppNavigation({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname();
  const projectId = pathname.match(/^\/projects\/([^/]+)/)?.[1];
  const projectItems = projectId
    ? [
        { href: `/projects/${projectId}`, label: 'Overview', icon: FolderKanban },
        { href: `/projects/${projectId}/dashboard`, label: 'Dashboard', icon: LayoutDashboard },
        { href: `/projects/${projectId}/traces`, label: 'Traces', icon: Activity },
        { href: `/projects/${projectId}/violations`, label: 'Guardrails', icon: ShieldAlert },
        { href: `/projects/${projectId}/datasets`, label: 'Datasets', icon: Database },
        { href: `/projects/${projectId}/evals`, label: 'Evals', icon: LineChart },
      ]
    : [];

  return (
    <nav
      aria-label="Workspace navigation"
      className={compact ? 'flex min-w-max items-center gap-2' : 'space-y-6'}
    >
      <NavigationGroup label="Workspace" items={rootItems} pathname={pathname} compact={compact} />
      {projectItems.length > 0 ? (
        <NavigationGroup
          label="Current project"
          items={projectItems}
          pathname={pathname}
          compact={compact}
        />
      ) : null}
    </nav>
  );
}

function NavigationGroup({
  label,
  items,
  pathname,
  compact,
}: {
  label: string;
  items: Array<{ href: string; label: string; icon: typeof FolderKanban }>;
  pathname: string;
  compact: boolean;
}) {
  return (
    <div className={compact ? 'flex items-center gap-1' : 'space-y-1'}>
      <p
        className={cn(
          'px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70',
          compact && 'sr-only'
        )}
      >
        {label}
      </p>
      {items.map((item) => {
        const Icon = item.icon;
        const exactOnly = item.href === '/projects' || item.label === 'Overview';
        const active =
          pathname === item.href || (!exactOnly && pathname.startsWith(`${item.href}/`));

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'group flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors',
              compact && 'h-9 gap-2 text-xs',
              active
                ? 'bg-white text-black'
                : 'text-muted-foreground hover:bg-white/[0.06] hover:text-foreground'
            )}
          >
            <Icon className="h-[18px] w-[18px]" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
