import { Plus } from 'lucide-react';
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
        <div className="flex items-center justify-between gap-4">
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Project
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
