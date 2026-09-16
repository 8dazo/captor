'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Activity, Database, FolderKanban, LineChart, ShieldAlert } from './icons';
import { getNavigationResource } from '../lib/navigation-context';
import { cn } from '../lib/utils';

const rootItems = [{ href: '/projects', label: 'Projects', icon: FolderKanban }];

type ResolvedProject = {
  resourceKey: string;
  project: { id: string; name: string };
};

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
  const resourceKey = navigationResource
    ? `${navigationResource.type}:${navigationResource.id}`
    : null;
  const [resolvedProject, setResolvedProject] = useState<ResolvedProject | null>(null);
  const resourceProject =
    resourceKey && resolvedProject?.resourceKey === resourceKey ? resolvedProject.project : null;
  const currentProjectId = projectId ?? routeProjectId ?? resourceProject?.id;
  const currentProjectName = projectName ?? resourceProject?.name;

  useEffect(() => {
    if (projectId || routeProjectId || !navigationResource || !resourceKey) {
      return undefined;
    }

    const controller = new AbortController();
    const params = new URLSearchParams({
      type: navigationResource.type,
      id: navigationResource.id,
    });

    void fetch(`/api/navigation-context?${params.toString()}`, {
      signal: controller.signal,
      headers: { accept: 'application/json' },
    })
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as { project?: { id: string; name: string } };
      })
      .then((payload) => {
        if (payload?.project) {
          setResolvedProject({ resourceKey, project: payload.project });
        }
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          setResolvedProject(null);
        }
      });

    return () => controller.abort();
  }, [navigationResource, projectId, resourceKey, routeProjectId]);

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
          label={currentProjectName ?? 'Project'}
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
