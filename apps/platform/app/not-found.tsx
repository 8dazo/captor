import Link from 'next/link';

import { AppShell } from '../components/app-shell';
import { Button } from '../components/ui/button';

export default function NotFound() {
  return (
    <AppShell>
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-6">
        <h2 className="text-2xl font-bold text-foreground">404 — Page not found</h2>
        <p className="text-sm text-muted-foreground">
          The page you are looking for does not exist.
        </p>
        <Button asChild>
          <Link href="/projects">Go to projects</Link>
        </Button>
      </div>
    </AppShell>
  );
}
