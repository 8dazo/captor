import * as React from 'react';

import { BlurFade } from '~/components/fragments/blur-fade';
import { GridSection } from '~/components/fragments/grid-section';

const TECH = ['TypeScript', 'OpenAI', 'Next.js', 'PostgreSQL'];

export function Logos(): React.JSX.Element {
  return (
    <GridSection className="bg-diagonal-lines">
      <div className="flex flex-col items-center justify-between gap-2 bg-background p-8 sm:flex-row sm:py-4">
        <BlurFade className="mb-6 sm:mb-0">
          <p className="max-w-[220px] text-center text-sm text-muted-foreground sm:text-left">
            Built for the modern AI stack
          </p>
        </BlurFade>
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4 lg:max-w-4xl lg:gap-10">
          {TECH.map((name, index) => (
            <BlurFade
              key={name}
              delay={0.2 + index * 0.2}
              className="flex items-center justify-center text-sm font-medium text-neutral-700 dark:text-neutral-300"
            >
              {name}
            </BlurFade>
          ))}
        </div>
      </div>
    </GridSection>
  );
}
