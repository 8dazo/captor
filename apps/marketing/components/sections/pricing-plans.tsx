import * as React from 'react';
import Link from 'next/link';
import {
  CheckIcon,
  ChevronRightIcon,
  PackageIcon,
  PanelsTopLeftIcon,
  UsersIcon,
} from 'lucide-react';

import { routes } from '@workspace/routes';
import { buttonVariants } from '@workspace/ui/components/button';
import { cn } from '@workspace/ui/lib/utils';

import { GridSection } from '~/components/fragments/grid-section';
import { SiteHeading } from '~/components/fragments/site-heading';

const SDK_FEATURES = [
  'Apache-2.0 open-source SDK',
  'Resource limits and outcome checks',
  'Batch checkpoints and resume',
  'Local JSONL or SQLite receipts and CLI',
  'Fetch and Prisma accounting adapters',
] as const;

const PLATFORM_FEATURES = [
  'Manual execution receipt import',
  'Saved status, usage, and outcome inspection',
  'Checkpoint and violation details',
  'JSON receipt download',
] as const;

const TEAM_FEATURES = [
  'Evaluate one real backfill or repair job',
  'Test limits, failure recovery, and idempotency',
  'Discuss deployment and retention requirements',
] as const;

function FeatureList({ items }: { items: readonly string[] }): React.JSX.Element {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-3 text-sm">
          <CheckIcon className="mt-0.5 size-4 shrink-0 text-primary" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function PricingPlans(): React.JSX.Element {
  return (
    <GridSection>
      <div className="container space-y-14 py-20">
        <SiteHeading
          badge="Access"
          title="Start locally. Share receipts when useful."
          description="The SDK is open source. Hosted pricing is not finalized; begin with a local workload and discuss team requirements as you evaluate."
        />

        <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-3">
          <div className="flex h-full flex-col rounded-xl border bg-background p-7">
            <div className="mb-6 flex size-11 items-center justify-center rounded-xl border bg-muted/30">
              <PackageIcon className="size-5" />
            </div>
            <h2 className="text-xl font-semibold">TypeScript SDK</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Install captar from npm and add execution contracts inside your own application.
            </p>
            <div className="my-6 border-t" />
            <FeatureList items={SDK_FEATURES} />
            <Link
              href="/docs/getting-started/installation"
              className={cn(buttonVariants({ variant: 'outline' }), 'group mt-8 rounded-xl')}
            >
              Install Captor
              <ChevronRightIcon className="ml-1 size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          <div className="relative flex h-full flex-col rounded-xl border border-primary bg-background p-7">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
              Optional
            </div>
            <div className="mb-6 flex size-11 items-center justify-center rounded-xl border bg-muted/30">
              <PanelsTopLeftIcon className="size-5" />
            </div>
            <h2 className="text-xl font-semibold">Receipt inspector</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Import saved execution receipts to inspect and share a snapshot of a run.
            </p>
            <div className="my-6 border-t" />
            <FeatureList items={PLATFORM_FEATURES} />
            <Link
              href="/docs/platform/receipts"
              className={cn(buttonVariants({ variant: 'default' }), 'group mt-8 rounded-xl')}
            >
              Explore receipt inspection
              <ChevronRightIcon className="ml-1 size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          <div className="flex h-full flex-col rounded-xl border bg-background p-7">
            <div className="mb-6 flex size-11 items-center justify-center rounded-xl border bg-muted/30">
              <UsersIcon className="size-5" />
            </div>
            <h2 className="text-xl font-semibold">Production / team use</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Evaluate Captor on a real job and discuss the deployment, recovery, and retention
              requirements.
            </p>
            <div className="my-6 border-t" />
            <FeatureList items={TEAM_FEATURES} />
            <Link
              href={routes.marketing.Contact}
              className={cn(buttonVariants({ variant: 'outline' }), 'group mt-8 rounded-xl')}
            >
              Contact us
              <ChevronRightIcon className="ml-1 size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>

        <div className="mx-auto max-w-4xl rounded-xl border border-dashed bg-muted/20 p-6 text-center text-sm leading-6 text-muted-foreground">
          Hosted pricing and support terms will be published when finalized. Local SDK use does not
          require a hosted subscription.
        </div>
      </div>
    </GridSection>
  );
}
