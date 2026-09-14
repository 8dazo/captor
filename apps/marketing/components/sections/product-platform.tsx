import * as React from 'react';
import {
  ActivityIcon,
  BarChart3Icon,
  DatabaseIcon,
  GaugeIcon,
  ShieldCheckIcon,
  WrenchIcon,
} from 'lucide-react';

import { BlurFade } from '~/components/fragments/blur-fade';
import { GridSection } from '~/components/fragments/grid-section';

const FEATURES = [
  {
    icon: GaugeIcon,
    title: 'Runtime budgets',
    description:
      'Reserve spend before a model request, block calls that would cross policy, then reconcile against actual usage after the response.',
  },
  {
    icon: WrenchIcon,
    title: 'Tool guardrails',
    description:
      'Track tool calls per session and enforce allowlists, blocklists, retries, and call ceilings before tools run.',
  },
  {
    icon: ActivityIcon,
    title: 'Span-first traces',
    description:
      'Inspect request and tool spans with provider, model, tokens, cost, retained payload context, events, and status.',
  },
  {
    icon: ShieldCheckIcon,
    title: 'Violation explorer',
    description:
      'Investigate request blocks, tool blocks, guardrail violations, and execution failures with links back to the affected trace.',
  },
  {
    icon: BarChart3Icon,
    title: 'Spend analytics',
    description:
      'Break down actual trace cost by provider and model while keeping legitimate zero-cost traffic visible.',
  },
  {
    icon: DatabaseIcon,
    title: 'Datasets and manual evals',
    description:
      'Turn retained traces into project datasets, import rows from files, and review them with pass/fail and weighted rubric criteria.',
  },
] as const;

export function ProductPlatform(): React.JSX.Element {
  return (
    <GridSection>
      <div className="container py-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">
            SDK + control plane
          </p>
          <h2 className="mt-4 text-3xl font-semibold md:text-5xl">
            Control the call, then understand what happened
          </h2>
          <p className="mt-6 text-lg leading-8 text-muted-foreground">
            Captar keeps the enforcement decision close to your application and sends the resulting
            runtime evidence to one platform. You do not have to choose between guardrails and
            observability.
          </p>
        </div>

        <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border bg-border md:grid-cols-2 xl:grid-cols-3">
          {FEATURES.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <BlurFade
                key={feature.title}
                inView
                delay={0.08 * index}
                className="bg-background p-7"
              >
                <div className="mb-5 flex size-11 items-center justify-center rounded-xl border bg-muted/40">
                  <Icon className="size-5" />
                </div>
                <h3 className="text-lg font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {feature.description}
                </p>
              </BlurFade>
            );
          })}
        </div>
      </div>
    </GridSection>
  );
}
