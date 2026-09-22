import * as React from 'react';

import { GridSection } from '~/components/fragments/grid-section';
import { SiteHeading } from '~/components/fragments/site-heading';

export function StoryHero(): React.JSX.Element {
  return (
    <GridSection hideVerticalGridLines>
      <div className="container py-24 md:py-32">
        <SiteHeading
          badge="Our Story"
          title="Bound the work. Keep the evidence."
          description="Captor grew from AI budget controls into execution contracts for production jobs. The same question applies to a model call or a data repair: how far may this run go, and how will we know it worked?"
        />
      </div>
    </GridSection>
  );
}
