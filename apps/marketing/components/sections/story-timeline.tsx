import * as React from 'react';

import { GridSection } from '~/components/fragments/grid-section';

const DATA = [
  {
    date: '2023',
    title: 'The journey begins',
    description:
      'Started building a runtime control layer to solve AI spend overruns and unsafe tool calls at scale.'
  },
  {
    date: '2024',
    title: 'First milestones',
    description:
      'Launched the TypeScript SDK with budget reservation, tool guardrails, and trace export for OpenAI apps.'
  },
  {
    date: '2025',
    title: 'Scaling and innovation',
    description:
      'Shipped the platform with trace inspection, project-scoped datasets, and manual eval review workflows.'
  }
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
            {DATA.map((milestone, index) => (
              <div
                key={index}
                className="relative pl-12"
              >
                <div className="absolute left-0 top-1 flex size-8 items-center justify-center rounded-full border bg-background">
                  <div className="size-2.5 rounded-full bg-primary" />
                </div>
                <div className="text-sm font-medium text-muted-foreground">
                  {milestone.date}
                </div>
                <h3 className="mb-4 text-xl font-medium">{milestone.title}</h3>
                <p className="leading-relaxed text-muted-foreground">
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
