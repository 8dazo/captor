import Link from 'next/link';

import { AppShell } from '~/components/app-shell';
import { ArrowRight, Waypoints } from '~/components/icons';
import { Button } from '~/components/ui/button';

export default function NotFound() {
  return (
    <AppShell>
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="w-full max-w-md text-center">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
            <Waypoints className="h-5 w-5" />
          </span>
          <p className="mt-8 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Error 404
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Page not found</h2>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
            The page you are looking for does not exist.
          </p>
          <Button asChild className="mt-6">
            <Link href="/projects">
              Return to projects
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
