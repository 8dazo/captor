import * as React from 'react';
import Link from 'next/link';

import { buttonVariants } from '@workspace/ui/components/button';
import { cn } from '@workspace/ui/lib/utils';

import { BlurFade } from '~/components/fragments/blur-fade';
import { GridSection } from '~/components/fragments/grid-section';
import { TextGenerateEffect } from '~/components/fragments/text-generate-effect';

export function CTA(): React.JSX.Element {
  return (
    <GridSection className="bg-diagonal-lines">
      <div className="container flex flex-col items-center justify-between gap-6 bg-background py-16 text-center">
        <div>
          <h3 className="m-0 max-w-fit text-3xl font-semibold md:text-4xl">
            <TextGenerateEffect words="Put a boundary around your next job" />
          </h3>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Install the SDK, set a resource ceiling, and run the local recovery demo.
          </p>
        </div>
        <BlurFade inView delay={0.5} className="flex flex-col gap-2 sm:flex-row">
          <Link
            href="/docs/getting-started/quickstart"
            className={cn(buttonVariants({ variant: 'default' }), 'rounded-xl')}
          >
            Run the quickstart
          </Link>
          <Link
            href="/docs/getting-started/recovery-demo"
            className={cn(buttonVariants({ variant: 'outline' }), 'rounded-xl')}
          >
            Try recovery
          </Link>
        </BlurFade>
      </div>
    </GridSection>
  );
}
