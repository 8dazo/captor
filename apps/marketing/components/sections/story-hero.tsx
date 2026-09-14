import * as React from 'react';

import { GridSection } from '~/components/fragments/grid-section';
import { SiteHeading } from '~/components/fragments/site-heading';

export function StoryHero(): React.JSX.Element {
  return (
    <GridSection hideVerticalGridLines>
      <div className="container py-24 md:py-32">
        <SiteHeading
          badge="Our Story"
          title="Runtime control for AI applications"
          description="Captar started from a simple problem: dashboards can explain spend after it happens, but they cannot stop the next request. We are building a runtime layer that can enforce a boundary first and preserve the evidence afterward."
        />
      </div>
    </GridSection>
  );
}
