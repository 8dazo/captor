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
          <h3 className="text-lg font-medium">Captor</h3>
          <p className="max-w-lg text-sm text-muted-foreground">
            Captor is developed in public. Follow the repository for implementation details, release
            notes, and opportunities to test it with real production jobs.
          </p>
        </div>
      </div>
    </GridSection>
  );
}
