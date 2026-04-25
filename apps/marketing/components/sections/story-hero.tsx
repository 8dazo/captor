import * as React from 'react';

import { GridSection } from '~/components/fragments/grid-section';
import { SiteHeading } from '~/components/fragments/site-heading';

export function StoryHero(): React.JSX.Element {
  return (
    <GridSection hideVerticalGridLines>
      <div className="container py-24 md:py-32">
        <SiteHeading
          badge="Our Story"
          title="Runtime control for the AI era"
          description="From a belief that AI apps need local-first guardrails to a runtime layer used by teams shipping OpenAI at scale. We're building the control plane that sits inside your application, not in front of it."
        />
      </div>
    </GridSection>
  );
}
