import * as React from 'react';

import { GridSection } from '~/components/fragments/grid-section';

export function StoryTeam(): React.JSX.Element {
  return (
    <GridSection>
      <div className="container max-w-6xl py-20">
        <h2 className="mb-16 text-sm font-medium uppercase tracking-wider text-muted-foreground ">
          Built by
        </h2>
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Captar</h3>
          <p className="max-w-lg text-sm text-muted-foreground">
            We're building the runtime control layer for production AI. Small team, big ambitions.
          </p>
        </div>
      </div>
    </GridSection>
  );
}
