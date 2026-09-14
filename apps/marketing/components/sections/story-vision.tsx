import * as React from 'react';

import { GridSection } from '~/components/fragments/grid-section';

export function StoryVision(): React.JSX.Element {
  return (
    <GridSection>
      <div className="container max-w-6xl py-20">
        <div className="grid gap-16 lg:grid-cols-2">
          <div>
            <h2 className="mb-8 text-sm font-medium uppercase tracking-wider text-muted-foreground">
              The idea
            </h2>
            <p className="text-2xl font-medium leading-relaxed md:text-3xl">
              “A runtime limit should be evaluated where the request is about to run—not after the
              invoice arrives.”
            </p>
          </div>
          <div className="space-y-6 text-base text-muted-foreground md:text-lg md:leading-8">
            <p>
              Captar does not ask you to replace your provider SDK with a hosted LLM gateway. The
              TypeScript runtime wraps an OpenAI-compatible client in-process, starts a budgeted
              session, applies call and tool policy, and emits spans around the work that actually ran.
            </p>
            <p>
              The hosted control plane is the other half of that design. It receives the runtime
              events and connects projects, hooks, sessions, traces, spend entries, violations,
              retained payloads, datasets, and manual evaluation runs.
            </p>
            <p>
              The goal is narrow on purpose: make the enforcement path useful before execution and
              make the resulting evidence useful after execution, without pretending Captar is the
              model provider itself.
            </p>
          </div>
        </div>
      </div>
    </GridSection>
  );
}
