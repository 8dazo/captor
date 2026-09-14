'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FolderKanban, PlugZap, Search, Wallet } from '../../components/icons';

import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';

type Project = {
  id: string;
  name: string;
  slug: string;
  hooks: unknown[];
  _count: { sessions: number; hooks: number };
};

export default function ProjectsClient({ projects }: { projects: Project[] }) {
  const [search, setSearch] = useState('');

  const filtered = projects.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-5">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search projects"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>
      {filtered.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              aria-label={`View project ${project.name}`}
            >
              <Card className="group h-full transition-all hover:-translate-y-0.5 hover:border-white/[0.16] hover:bg-white/[0.045]">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle>{project.name}</CardTitle>
                      <CardDescription>{project.slug}</CardDescription>
                    </div>
                    <Badge variant="secondary">{project.hooks.length} hooks</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FolderKanban className="h-4 w-4 text-foreground/70" />
                    {project._count.sessions} sessions
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <PlugZap className="h-4 w-4 text-foreground/70" />
                    {project._count.hooks} hook connections
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Wallet className="h-4 w-4 text-foreground/70" />
                    Authenticated observability ready
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center">
          <FolderKanban className="mx-auto h-7 w-7 text-muted-foreground" />
          <p className="mt-4 text-sm font-medium">No matching projects</p>
          <p className="mt-1 text-xs text-muted-foreground">Try a different project name.</p>
        </div>
      )}
    </div>
  );
}
