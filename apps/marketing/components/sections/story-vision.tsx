import * as React from 'react';

import { GridSection } from '~/components/fragments/grid-section';

export function StoryVision(): React.JSX.Element {
  return (
    <GridSection>
      <div className="container max-w-6xl py-20">
        <div className="grid gap-16 lg:grid-cols-2">
          <div>
            <h2 className="mb-8 text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Our vision
            </h2>
            <p className="text-2xl font-medium leading-relaxed md:text-3xl">
              "AI infrastructure shouldn't just observe — it should enforce policy
              before a request ever reaches a provider."
            </p>
          </div>
          <div className="space-y-6 text-base text-muted-foreground md:text-lg">
            <p>
              Traditional AI governance was built for a different era — proxies,
              gateways, and external policy servers. We're creating the first
              true runtime-native control layer that evaluates, budgets, and
              traces inside your application.
            </p>
            <p>
              By combining precise cost estimation with local policy enforcement,
              we've built a system that protects budget, blocks unsafe tool calls,
              and produces rich traces — all without adding infrastructure
              overhead or handing over provider keys.
            </p>
          </div>
        </div>
      </div>
    </GridSection>
  );
}
