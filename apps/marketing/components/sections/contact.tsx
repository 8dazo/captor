import * as React from 'react';
import Link from 'next/link';
import { BookOpenIcon, GithubIcon, PanelsTopLeftIcon } from 'lucide-react';

import { routes } from '@workspace/routes';
import { buttonVariants } from '@workspace/ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { cn } from '@workspace/ui/lib/utils';

import { GridSection } from '~/components/fragments/grid-section';
import { SiteHeading } from '~/components/fragments/site-heading';

const DESTINATIONS = [
  {
    title: 'Product and SDK questions',
    description: 'Explore execution contracts, adapters, checkpoints, and receipt stores.',
    icon: BookOpenIcon,
    href: routes.marketing.Docs,
    label: 'Open docs',
    external: false,
  },
  {
    title: 'Bugs and implementation details',
    description:
      'Captor is developed in public. Use the repository to inspect the source, report a reproducible issue, or follow the current work.',
    icon: GithubIcon,
    href: 'https://github.com/8dazo/captor',
    label: 'Open GitHub',
    external: true,
  },
  {
    title: 'Bring a real workload',
    description:
      'Use the pilot checklist to evaluate one backfill or repair job, including a failure and retry.',
    icon: PanelsTopLeftIcon,
    href: 'https://github.com/8dazo/captor/blob/main/docs/product/pilot-checklist.md',
    label: 'Read the pilot checklist',
    external: false,
  },
] as const;

export function Contact(): React.JSX.Element {
  return (
    <GridSection>
      <div className="container space-y-16 py-20">
        <SiteHeading
          badge="Contact"
          title="Bring your next backfill"
          description="Find integration guidance, report a reproducible issue, or evaluate Captor with a real workload."
        />

        <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
          {DESTINATIONS.map((destination) => {
            const Icon = destination.icon;
            return (
              <Card key={destination.title} className="flex h-full flex-col">
                <CardHeader>
                  <div className="mb-4 flex size-11 items-center justify-center rounded-xl border bg-muted/30">
                    <Icon className="size-5" />
                  </div>
                  <CardTitle>{destination.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col">
                  <p className="flex-1 text-sm leading-6 text-muted-foreground">
                    {destination.description}
                  </p>
                  <Link
                    href={destination.href}
                    target={destination.external ? '_blank' : undefined}
                    rel={destination.external ? 'noreferrer' : undefined}
                    className={cn(buttonVariants({ variant: 'outline' }), 'mt-6 rounded-xl')}
                  >
                    {destination.label}
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mx-auto max-w-3xl rounded-xl border border-dashed bg-muted/20 p-6 text-center text-sm leading-6 text-muted-foreground">
          When reporting a problem, include a minimal example, SDK version, and redacted receipt.
          Keep credentials and customer data out of public issues.
        </div>
      </div>
    </GridSection>
  );
}
