'use client';

import Link from 'next/link';
import { useState } from 'react';

import { ArrowRight, FolderKanban, Search } from '../../components/icons';
import { Input } from '../../components/ui/input';

type Project = {
  id: string;
  name: string;
  slug: string;
  hooks: unknown[];
  _count: { sessions: number; hooks: number };
};

export default function ProjectsClient({ projects }: { projects: Project[] }) {
  const [search, setSearch] = useState('');
  const query = search.trim().toLowerCase();
  const filtered = projects.filter(
    (project) =>
      !query ||
      project.name.toLowerCase().includes(query) ||
      project.slug.toLowerCase().includes(query)
  );

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          aria-label="Search projects"
          placeholder="Search projects"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="pl-9"
        />
      </div>

      {filtered.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="hidden grid-cols-[minmax(0,1fr)_120px_120px_32px] gap-4 border-b border-border px-4 py-2.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground sm:grid">
            <span>Project</span>
            <span className="text-right">Connections</span>
            <span className="text-right">Sessions</span>
            <span className="sr-only">Open</span>
          </div>
          <div className="divide-y divide-border">
            {filtered.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="group grid gap-3 px-4 py-3.5 transition-colors hover:bg-white/[0.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:grid-cols-[minmax(0,1fr)_120px_120px_32px] sm:items-center sm:gap-4"
                aria-label={`Open ${project.name}`}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{project.name}</p>
                  <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                    {project.slug}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-3 text-sm sm:block sm:text-right">
                  <span className="text-xs text-muted-foreground sm:hidden">Connections</span>
                  <span className="tabular-nums">{project._count.hooks}</span>
                </div>
                <div className="flex items-center justify-between gap-3 text-sm sm:block sm:text-right">
                  <span className="text-xs text-muted-foreground sm:hidden">Sessions</span>
                  <span className="tabular-nums">{project._count.sessions}</span>
                </div>
                <ArrowRight className="hidden h-4 w-4 justify-self-end text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground sm:block" />
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border px-6 py-14 text-center">
          <FolderKanban className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">
            {projects.length ? 'No matching projects' : 'No projects yet'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {projects.length
              ? 'Try a different project name or slug.'
              : 'Create a project to connect your first runtime.'}
          </p>
        </div>
      )}
    </div>
  );
}
