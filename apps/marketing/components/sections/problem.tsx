import * as React from 'react';
import { CircleDollarSignIcon, RouteIcon, WorkflowIcon } from 'lucide-react';

import { BlurFade } from '~/components/fragments/blur-fade';
import { GridSection } from '~/components/fragments/grid-section';
import { TextGenerateWithSelectBoxEffect } from '~/components/fragments/text-generate-with-select-box-effect';

const DATA = [
  {
    icon: <CircleDollarSignIcon className="size-5 shrink-0" />,
    title: 'A model call can be cheap. A loop is not.',
    description:
      'Agentic code can repeat requests, retry tools, or fan out unexpectedly. Captar evaluates budget policy before execution so a session has a hard runtime boundary instead of only a dashboard alert after the spend happened.',
  },
  {
    icon: <WorkflowIcon className="size-5 shrink-0" />,
    title: 'Tool execution needs the same runtime context',
    description:
      'Model output is only part of an AI workflow. Captar tracks tool calls inside the same session and can enforce allowlists, blocklists, and per-session call ceilings before external side effects run.',
  },
  {
    icon: <RouteIcon className="size-5 shrink-0" />,
    title: 'Observability without control is incomplete',
    description:
      'A trace can explain a failure after the fact, but it cannot stop an over-budget request. Captar keeps enforcement in the SDK and sends the resulting spans, spend, payload context, and violations to the platform for debugging.',
  },
];

export function Problem(): React.JSX.Element {
  return (
    <GridSection>
      <div className="px-4 py-20 text-center">
        <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-primary">
          Why runtime control exists
        </p>
        <h2 className="text-3xl font-semibold md:text-5xl">
          <TextGenerateWithSelectBoxEffect words="AI needs a boundary, not just another dashboard" />
        </h2>
      </div>
      <div className="grid divide-y border-t border-dashed md:grid-cols-3 md:divide-x md:divide-y-0">
        {DATA.map((statement, index) => (
          <BlurFade
            key={statement.title}
            inView
            delay={0.15 + index * 0.15}
            className="border-dashed px-8 py-12"
          >
            <div className="mb-7 flex size-12 items-center justify-center rounded-2xl border bg-background shadow">
              {statement.icon}
            </div>
            <h3 className="mb-3 text-lg font-semibold">{statement.title}</h3>
            <p className="leading-7 text-muted-foreground">{statement.description}</p>
          </BlurFade>
        ))}
      </div>
    </GridSection>
  );
}
