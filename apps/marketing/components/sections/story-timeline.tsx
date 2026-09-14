import * as React from 'react';

import { GridSection } from '~/components/fragments/grid-section';

const DATA = [
  {
    date: 'Feb 2026',
    title: 'Captar work begins',
    description:
      'The initial focus is budget enforcement for AI agents: stop repeated calls and over-budget execution inside the application runtime.',
  },
  {
    date: 'Spring 2026',
    title: 'SDK + control-plane architecture takes shape',
    description:
      'The design settles on a TypeScript SDK that keeps provider clients and keys in the app, plus a hosted platform for policy sync, traces, spend, and violations.',
  },
  {
    date: 'Sep 2026',
    title: 'Public npm package and broader platform workflow',
    description:
      'The public `captar` package reaches v0.5.0, with OpenAI-compatible wrapping, provider identity, actual-cost reconciliation, and platform workflows for traces, datasets, and manual evals.',
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
