'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FolderKanban, PlugZap, Search, Wallet } from 'lucide-react';

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
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search projects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((project) => (
          <Link
            key={project.id}
            href={`/projects/${project.id}`}
            aria-label={`View project ${project.name}`}
          >
            <Card className="h-full transition hover:border-primary/40">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>{project.name}</CardTitle>
                    <CardDescription>{project.slug}</CardDescription>
                  </div>
                  <Badge>{project.hooks.length} hooks</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FolderKanban className="h-4 w-4 text-primary" />
                  {project._count.sessions} sessions
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <PlugZap className="h-4 w-4 text-primary" />
                  {project._count.hooks} hook connections
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Wallet className="h-4 w-4 text-primary" />
                  Authenticated observability ready
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
