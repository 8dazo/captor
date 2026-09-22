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
              Define the boundary before work starts. Verify the outcome when it finishes.
            </p>
          </div>
          <div className="space-y-6 text-base text-muted-foreground md:text-lg md:leading-8">
            <p>
              Production jobs already have runners. Captor adds limits, checkpoints, and outcome
              checks inside those jobs, where the application can reserve capacity before a side
              effect.
            </p>
            <p>
              Local receipts preserve the accounted usage and completed progress. A resumed backfill
              starts from a durable checkpoint, with the application responsible for source ordering
              and idempotent writes.
            </p>
            <p>
              The optional platform inspects manually imported receipts. Existing AI integrations
              remain available as a compatibility path.
            </p>
          </div>
        </div>
      </div>
    </GridSection>
  );
}
