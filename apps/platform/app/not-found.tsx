import Image from 'next/image';
import Link from 'next/link';

import { AppShell } from '~/components/app-shell';
import { ArrowRight } from '~/components/icons';
import { Button } from '~/components/ui/button';

export default function NotFound() {
  return (
    <AppShell>
      <div className="flex min-h-[55vh] items-center justify-center py-10">
        <div className="w-full max-w-md text-center">
          <Image
            src="/icon.png"
            alt=""
            width={36}
            height={36}
            className="mx-auto h-9 w-9 object-contain"
          />
          <p className="mt-6 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Error 404
          </p>
          <h2 className="mt-1.5 text-2xl font-semibold tracking-[-0.025em]">Page not found</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-5 text-muted-foreground">
            This resource may have moved, been removed, or is not available in your workspace.
          </p>
          <Button asChild className="mt-5">
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
