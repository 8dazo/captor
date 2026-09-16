'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Activity, Database, FolderKanban, LineChart, ShieldAlert } from './icons';
import { cn } from '../lib/utils';

const rootItems = [{ href: '/projects', label: 'Projects', icon: FolderKanban }];

export function AppNavigation({
  compact = false,
  projectId,
}: {
  compact?: boolean;
  projectId?: string;
}) {
  const pathname = usePathname();
  const routeProjectId = pathname.match(/^\/projects\/([^/]+)/)?.[1];
  const currentProjectId = projectId ?? routeProjectId;
  const projectItems = currentProjectId
    ? [
        { href: `/projects/${currentProjectId}`, label: 'Overview', icon: FolderKanban },
        { href: `/projects/${currentProjectId}/traces`, label: 'Traces', icon: Activity },
        {
          href: `/projects/${currentProjectId}/violations`,
          label: 'Guardrails',
          icon: ShieldAlert,
        },
        { href: `/projects/${currentProjectId}/datasets`, label: 'Datasets', icon: Database },
        { href: `/projects/${currentProjectId}/evals`, label: 'Evals', icon: LineChart },
      ]
    : [];

  return (
    <nav
      aria-label="Workspace navigation"
      className={compact ? 'flex min-w-max items-center gap-1' : 'space-y-5'}
    >
      <NavigationGroup label="Workspace" items={rootItems} pathname={pathname} compact={compact} />
      {projectItems.length > 0 ? (
        <NavigationGroup
          label="Project"
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
    <div className={compact ? 'flex items-center gap-1' : 'space-y-0.5'}>
      <p
        className={cn(
          'px-2.5 pb-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70',
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
              'group flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-medium transition-colors',
              compact && 'h-8 gap-2 px-2 text-xs',
              active
                ? 'bg-white/[0.07] text-foreground'
                : 'text-muted-foreground hover:bg-white/[0.045] hover:text-foreground'
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
