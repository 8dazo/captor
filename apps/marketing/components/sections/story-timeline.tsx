import * as React from 'react';

import { GridSection } from '~/components/fragments/grid-section';

const DATA = [
  {
    date: 'Origins',
    title: 'AI runtime budgets',
    description:
      'The project began with in-process budgets, provider wrapping, and trace inspection for AI applications.',
  },
  {
    date: 'Execution contracts',
    title: 'A boundary for arbitrary resources',
    description:
      'The runtime now supports named resource limits, reservations, checkpoints, and outcome metrics for jobs such as backfills and reconciliation.',
  },
  {
    date: 'Current focus',
    title: 'Recovery that can be demonstrated',
    description:
      'Local stores, CLI inspection, and a fresh-process demo make the recovery path testable. The next step is validating these boundaries on real workloads.',
  },
];

export function StoryTimeline(): React.JSX.Element {
  return (
    <GridSection>
      <div className="container max-w-6xl py-20">
        <h2 className="mb-16 text-sm font-medium uppercase tracking-wider text-muted-foreground">
          The road so far
        </h2>
        <div className="relative">
          <div className="absolute left-4 top-0 h-full w-0.5 bg-border" />
          <div className="space-y-16">
            {DATA.map((milestone) => (
              <div key={milestone.date} className="relative pl-12">
                <div className="absolute left-0 top-1 flex size-8 items-center justify-center rounded-full border bg-background">
                  <div className="size-2.5 rounded-full bg-primary" />
                </div>
                <div className="text-sm font-medium text-muted-foreground">{milestone.date}</div>
                <h3 className="mb-4 text-xl font-medium">{milestone.title}</h3>
                <p className="max-w-3xl leading-relaxed text-muted-foreground">
                  {milestone.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </GridSection>
  );
}
