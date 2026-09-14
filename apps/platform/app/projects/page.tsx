import { Plus } from '../../components/icons';
import { redirect } from 'next/navigation';

import { AppShell } from '../../components/app-shell';
import { ProjectCreateForm } from '../../components/project-create-form';
import { Button } from '../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../components/ui/dialog';
import { requireUser } from '../../lib/auth-guard';
import { listUserProjects } from '../../lib/platform';
import ProjectsClient from './projects-client';

export const dynamic = 'force-dynamic';

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
      <div className="space-y-6">
        <div className="flex flex-col gap-5 border-b border-white/[0.07] pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Workspace
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Projects</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Manage runtime connections, policies, traces, datasets, and evaluations by project.
            </p>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" />
                New project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create project</DialogTitle>
              </DialogHeader>
              <ProjectCreateForm />
            </DialogContent>
          </Dialog>
        </div>
        <ProjectsClient projects={projects} />
      </div>
    </AppShell>
  );
}
