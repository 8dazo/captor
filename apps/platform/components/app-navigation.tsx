'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Activity, Database, FolderKanban, LineChart, ShieldAlert } from './icons';
import { getNavigationResource } from '../lib/navigation-context';
import { cn } from '../lib/utils';

const rootItems = [{ href: '/projects', label: 'Projects', icon: FolderKanban }];

type ProjectContext = { id: string; name: string };
type ResolvedProject = { resourceKey: string; project: ProjectContext };

const inFlightProjectRequests = new Map<string, Promise<ProjectContext | null>>();

function loadResourceProject(resourceKey: string, type: 'trace' | 'hook', id: string) {
  const existing = inFlightProjectRequests.get(resourceKey);
  if (existing) return existing;

  const params = new URLSearchParams({ type, id });
  const request = fetch(`/api/navigation-context?${params.toString()}`, {
    headers: { accept: 'application/json' },
  })
    .then(async (response) => {
      if (!response.ok) return null;
      const payload = (await response.json()) as { project?: ProjectContext };
      return payload.project ?? null;
    })
    .catch(() => null)
    .finally(() => {
      inFlightProjectRequests.delete(resourceKey);
    });

  inFlightProjectRequests.set(resourceKey, request);
  return request;
}

export function AppNavigation({
  compact = false,
  projectId,
  projectName,
}: {
  compact?: boolean;
  projectId?: string;
  projectName?: string;
}) {
  const pathname = usePathname();
  const routeProjectId = pathname.match(/^\/projects\/([^/]+)/)?.[1];
  const navigationResource = getNavigationResource(pathname);
  const resourceType = navigationResource?.type;
  const resourceId = navigationResource?.id;
  const resourceKey = resourceType && resourceId ? `${resourceType}:${resourceId}` : null;
  const [resolvedProject, setResolvedProject] = useState<ResolvedProject | null>(null);
  const resourceProject =
    resourceKey && resolvedProject?.resourceKey === resourceKey ? resolvedProject.project : null;
  const currentProjectId = projectId ?? routeProjectId ?? resourceProject?.id;
  const currentProjectName = projectName ?? resourceProject?.name;
  const projectActiveLabel =
    resourceType === 'trace' ? 'AI traces' : resourceType === 'hook' ? 'Overview' : undefined;

  useEffect(() => {
    if (projectId || routeProjectId || !resourceType || !resourceId || !resourceKey) {
      return undefined;
    }

    let cancelled = false;
    void loadResourceProject(resourceKey, resourceType, resourceId).then((project) => {
      if (cancelled) return;
      setResolvedProject(project ? { resourceKey, project } : null);
    });

    return () => {
      cancelled = true;
    };
  }, [projectId, resourceId, resourceKey, resourceType, routeProjectId]);

  const projectItems = currentProjectId
    ? [
        { href: `/projects/${currentProjectId}`, label: 'Overview', icon: FolderKanban },
        { href: `/projects/${currentProjectId}/runs`, label: 'Runs', icon: Activity },
        { href: `/projects/${currentProjectId}/traces`, label: 'AI traces', icon: Activity },
        {
          href: `/projects/${currentProjectId}/violations`,
          label: 'Violations',
          icon: ShieldAlert,
        },
        { href: `/projects/${currentProjectId}/datasets`, label: 'Contracts', icon: Database },
        { href: `/projects/${currentProjectId}/evals`, label: 'Backfills', icon: LineChart },
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
          label={currentProjectName ?? 'Project'}
          items={projectItems}
          pathname={pathname}
          compact={compact}
          activeLabel={projectActiveLabel}
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
  activeLabel,
}: {
  label: string;
  items: Array<{ href: string; label: string; icon: typeof FolderKanban }>;
  pathname: string;
  compact: boolean;
  activeLabel?: string;
}) {
  return (
    <div className={compact ? 'flex items-center gap-1' : 'space-y-0.5'}>
      <p
        className={cn(
          'truncate px-2.5 pb-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70',
          compact && 'sr-only'
        )}
        title={label}
      >
        {label}
      </p>
      {items.map((item) => {
        const Icon = item.icon;
        const exactOnly = item.href === '/projects' || item.label === 'Overview';
        const active = activeLabel
          ? item.label === activeLabel
          : pathname === item.href || (!exactOnly && pathname.startsWith(`${item.href}/`));

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
