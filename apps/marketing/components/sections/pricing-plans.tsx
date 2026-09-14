import * as React from 'react';
import Link from 'next/link';
import { CheckIcon, ChevronRightIcon, PackageIcon, PanelsTopLeftIcon, UsersIcon } from 'lucide-react';

import { routes } from '@workspace/routes';
import { buttonVariants } from '@workspace/ui/components/button';
import { cn } from '@workspace/ui/lib/utils';

import { GridSection } from '~/components/fragments/grid-section';
import { SiteHeading } from '~/components/fragments/site-heading';

const SDK_FEATURES = [
  'Public npm package: captar',
  'OpenAI-compatible client wrapping',
  'Session budgets and call policy',
  'Tool tracking and guardrails',
  'Trace/event export to a control-plane hook',
] as const;

const PLATFORM_FEATURES = [
  'Projects and hook connections',
  'Trace, span, spend, and violation inspection',
  'Provider and model context',
  'Project datasets and file import/export',
  'Manual evaluation runs and rubric scoring',
] as const;

const TEAM_FEATURES = [
  'Discuss deployment and usage requirements',
  'Discuss retention and operational requirements',
  'Discuss rollout needs before commercial terms are set',
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
          title="Use what exists today. No invented plan limits."
          description="Captar is still early. The SDK is published, the hosted control plane is the product surface, and fixed commercial pricing is not being advertised until the packaging is finalized."
        />

        <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-3">
          <div className="flex h-full flex-col rounded-xl border bg-background p-7">
            <div className="mb-6 flex size-11 items-center justify-center rounded-xl border bg-muted/30">
              <PackageIcon className="size-5" />
            </div>
            <h2 className="text-xl font-semibold">TypeScript SDK</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Install the current public SDK from npm and enforce runtime policy from your own app.
            </p>
            <div className="my-6 border-t" />
            <FeatureList items={SDK_FEATURES} />
            <Link
              href="/docs/getting-started/installation"
              className={cn(buttonVariants({ variant: 'outline' }), 'group mt-8 rounded-xl')}
            >
              Install Captar
              <ChevronRightIcon className="ml-1 size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          <div className="relative flex h-full flex-col rounded-xl border border-primary bg-background p-7">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
              Product surface
            </div>
            <div className="mb-6 flex size-11 items-center justify-center rounded-xl border bg-muted/30">
              <PanelsTopLeftIcon className="size-5" />
            </div>
            <h2 className="text-xl font-semibold">Hosted control plane</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Create projects and hooks, ingest SDK events, and inspect runtime behavior in the platform.
            </p>
            <div className="my-6 border-t" />
            <FeatureList items={PLATFORM_FEATURES} />
            <Link
              href={routes.dashboard.auth.SignUp}
              className={cn(buttonVariants({ variant: 'default' }), 'group mt-8 rounded-xl')}
            >
              Open the platform
              <ChevronRightIcon className="ml-1 size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          <div className="flex h-full flex-col rounded-xl border bg-background p-7">
            <div className="mb-6 flex size-11 items-center justify-center rounded-xl border bg-muted/30">
              <UsersIcon className="size-5" />
            </div>
            <h2 className="text-xl font-semibold">Production / team use</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              If you are evaluating Captar for a real workload, talk to us about the requirements instead of choosing from fictional limits.
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
          We are intentionally not publishing made-up seat counts, request quotas, support SLAs, or a
          monthly price before those terms are finalized. This page will become conventional pricing
          when Captar has real commercial packaging to publish.
        </div>
      </div>
    </GridSection>
  );
}
