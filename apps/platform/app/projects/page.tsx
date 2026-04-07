import Link from "next/link";
import { FolderKanban, PlugZap, Wallet } from "lucide-react";
import { redirect } from "next/navigation";

import { AppShell } from "../../components/app-shell";
import { ProjectCreateForm } from "../../components/project-create-form";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { requireUser } from "../../lib/auth-guard";
import { listUserProjects } from "../../lib/platform";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const user = await requireUser();
  const projects = await listUserProjects(user.id);

  if (projects.length === 1) {
    const firstProject = projects[0];
    if (firstProject) {
      redirect(`/projects/${firstProject.id}`);
    }
  }

  return (
    <AppShell userName={user.email}>
      <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <ProjectCreateForm />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className="h-full transition hover:border-cyan-400/40">
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
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <FolderKanban className="h-4 w-4 text-cyan-300" />
                    {project._count.sessions} sessions
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <PlugZap className="h-4 w-4 text-cyan-300" />
                    {project._count.hooks} hook connections
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <Wallet className="h-4 w-4 text-cyan-300" />
                    Authenticated observability ready
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
