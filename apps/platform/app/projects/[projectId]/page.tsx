import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Activity, FolderKanban, LayoutDashboard, ShieldCheck } from '../../../components/icons';

import { AppShell } from '../../../components/app-shell';
import { HookCreateDialog } from '../../../components/hook-create-dialog';
import { MetricCard } from '../../../components/metric-card';
import { Badge } from '../../../components/ui/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../../../components/ui/breadcrumb';
import { Button } from '../../../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../components/ui/table';
import { requireUser } from '../../../lib/auth-guard';
import { getProjectById } from '../../../lib/platform';

export const dynamic = 'force-dynamic';

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const user = await requireUser();
  const { projectId } = await params;
  const project = await getProjectById(projectId, user.id);

  if (!project) {
    notFound();
  }

  return (
    <AppShell userName={user.email}>
      <div className="grid gap-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/projects">Projects</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{project.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <Card>
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CardTitle>{project.name}</CardTitle>
                <Badge>{project.slug}</Badge>
              </div>
              <CardDescription>
                Execution history and safety controls for production work connected to this project.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" asChild>
                <Link href={`/projects/${project.id}/dashboard`}>
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Run dashboard
                </Link>
              </Button>
              <HookCreateDialog projectId={project.id} />
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-4">
            <MetricCard
              label="Run sources"
              value={String(project._count.hooks)}
              icon={<Activity className="h-4 w-4" />}
            />
            <MetricCard
              label="Runs"
              value={String(project._count.sessions)}
              href={`/projects/${project.id}/traces`}
            />
            <MetricCard
              label="Saved contracts"
              value={String(project._count.datasets)}
              href={`/projects/${project.id}/datasets`}
            />
            <MetricCard
              label="Backfill reviews"
              value={String(project._count.manualEvals)}
              href={`/projects/${project.id}/evals`}
            />
          </CardContent>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
          <Card>
            <CardHeader>
              <CardTitle>Connected runtimes</CardTitle>
              <CardDescription>
                Existing hook connections remain the ingestion boundary while the platform moves to
                execution contracts and receipts.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Environment</TableHead>
                    <TableHead>Runs</TableHead>
                    <TableHead>Evidence</TableHead>
                    <TableHead>Violations</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {project.hooks.map((hook) => (
                    <TableRow key={hook.id}>
                      <TableCell>
                        <Link
                          className="font-medium text-primary hover:text-primary/80"
                          href={`/hooks/${hook.publicId}`}
                        >
                          {hook.name}
                        </Link>
                      </TableCell>
                      <TableCell>{hook.environment}</TableCell>
                      <TableCell>{hook._count.llmSessions}</TableCell>
                      <TableCell>{hook._count.traces}</TableCell>
                      <TableCell>{hook._count.violations}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Execution model</CardTitle>
                <CardDescription>
                  Captor Cloud is optional. Local execution remains the source of truth.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <div className="flex items-start gap-3">
                  <FolderKanban className="mt-0.5 h-4 w-4 text-primary" />
                  <p>Projects group run history, contracts, checkpoints, and violations.</p>
                </div>
                <div className="flex items-start gap-3">
                  <Activity className="mt-0.5 h-4 w-4 text-primary" />
                  <p>
                    Runs show what an execution consumed and whether it stayed inside its declared
                    limits.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 text-primary" />
                  <p>
                    A successful process can still fail its contract when required outcomes are not
                    satisfied.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Current transition</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Existing trace, dataset, and review records are retained while their UI is migrated
                  to runs, contracts, and backfills.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/projects/${project.id}/traces`}>Open runs</Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/projects/${project.id}/violations`}>Open violations</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
