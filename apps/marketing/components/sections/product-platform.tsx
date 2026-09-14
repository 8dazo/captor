'use client';

import * as React from 'react';
import { ActivityIcon, GaugeIcon, ShieldCheckIcon } from 'lucide-react';

import { BlurFade } from '~/components/fragments/blur-fade';
import { GridSection } from '~/components/fragments/grid-section';

const FEATURES = [
  {
    icon: ActivityIcon,
    title: 'Trace every call',
    description:
      'Inspect request and tool spans with model, tokens, cost, status, and retained payload context.',
  },
  {
    icon: GaugeIcon,
    title: 'Set runtime limits',
    description: 'Reserve budget and apply request or tool policy before external work runs.',
  },
  {
    icon: ShieldCheckIcon,
    title: 'Keep the evidence',
    description:
      'Connect blocked calls, failures, spend, and policy violations to the trace that produced them.',
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
            One path from execution to evidence
          </h2>
          <p className="mt-6 text-lg leading-8 text-muted-foreground">
            The SDK stays in your app. The resulting trace lands in one control plane.
          </p>
        </div>

        <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border bg-border md:grid-cols-3">
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
