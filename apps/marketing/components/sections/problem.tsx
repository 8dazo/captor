import * as React from 'react';
import { BarChartIcon, UserPlusIcon, WorkflowIcon } from 'lucide-react';

import { BlurFade } from '~/components/fragments/blur-fade';
import { GridSection } from '~/components/fragments/grid-section';
import { TextGenerateWithSelectBoxEffect } from '~/components/fragments/text-generate-with-select-box-effect';

const DATA = [
  {
    icon: <UserPlusIcon className="size-5 shrink-0" />,
    title: 'Runaway AI spend',
    description:
      'Without per-request budget enforcement, model calls can silently burn through monthly limits in hours. Captar reserves budget before execution and reconciles after.',
  },
  {
    icon: <BarChartIcon className="size-5 shrink-0" />,
    title: 'Unsafe tool calls',
    description:
      'Tools hitting external systems without runtime guardrails create security blind spots. Captar evaluates allowlists, blocklists, and per-session limits before any tool runs.',
  },
  {
    icon: <WorkflowIcon className="size-5 shrink-0" />,
    title: 'No local visibility',
    description:
      'When everything runs through a proxy, you lose the thread between application state and model behavior. Captar traces spans inside your runtime so debugging stays local.',
  },
];

export function Problem(): React.JSX.Element {
  return (
    <GridSection>
      <div className="px-4 py-20 text-center">
        <h2 className="text-3xl font-semibold md:text-5xl">
          <TextGenerateWithSelectBoxEffect words="AI apps leak budget, tools, and control" />
        </h2>
      </div>
      <div className="grid divide-y border-t border-dashed md:grid-cols-3 md:divide-x md:divide-y-0">
        {DATA.map((statement, index) => (
          <BlurFade
            key={index}
            inView
            delay={0.2 + index * 0.2}
            className="border-dashed px-8 py-12"
          >
            <div className="mb-7 flex size-12 items-center justify-center rounded-2xl border bg-background shadow">
              {statement.icon}
            </div>
            <h3 className="mb-3 text-lg font-semibold">{statement.title}</h3>
            <p className="text-muted-foreground">{statement.description}</p>
          </BlurFade>
        ))}
      </div>
    </GridSection>
  );
}
