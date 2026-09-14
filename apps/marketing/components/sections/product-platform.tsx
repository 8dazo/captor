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
      'Reserve spend before a model request, block calls that would cross policy, then reconcile against provider-reported usage after the response.',
  },
  {
    icon: WrenchIcon,
    title: 'Tool guardrails',
    description:
      'Track tool calls per session and enforce allowlists, blocklists, call ceilings, retries, and workflow limits in your application runtime.',
  },
  {
    icon: ActivityIcon,
    title: 'Span-first traces',
    description:
      'Inspect request and tool spans, payload retention, failures, blocked operations, token usage, spend, and provider/model context in one trace.',
  },
  {
    icon: ShieldCheckIcon,
    title: 'Violation explorer',
    description:
      'Investigate request blocks, tool blocks, guardrail violations, and execution failures across hooks with links back to the exact trace.',
  },
  {
    icon: BarChart3Icon,
    title: 'Spend analytics',
    description:
      'Break down actual trace cost by provider and model, including zero-cost traffic from free OpenRouter routes.',
  },
  {
    icon: DatabaseIcon,
    title: 'Datasets and evals',
    description:
      'Turn retained traces into project datasets, import your own rows, and run manual rubric-based evaluations against real application behavior.',
  },
] as const;

export function ProductPlatform(): React.JSX.Element {
  return (
    <GridSection>
      <div className="container py-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">One runtime control plane</p>
          <h2 className="mt-4 text-3xl font-semibold md:text-5xl">
            Control the call, then understand what happened
          </h2>
          <p className="mt-6 text-lg text-muted-foreground">
            Captar combines enforcement and observability. The SDK makes decisions before execution;
            the platform gives you the trace, spend, violation, dataset, and evaluation context after it.
          </p>
        </div>

        <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border bg-border md:grid-cols-2 xl:grid-cols-3">
          {FEATURES.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <BlurFade key={feature.title} inView delay={0.08 * index} className="bg-background p-7">
                <div className="mb-5 flex size-11 items-center justify-center rounded-xl border bg-muted/40">
                  <Icon className="size-5" />
                </div>
                <h3 className="text-lg font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{feature.description}</p>
              </BlurFade>
            );
          })}
        </div>
      </div>
    </GridSection>
  );
}
