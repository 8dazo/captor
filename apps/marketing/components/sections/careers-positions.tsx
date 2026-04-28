import * as React from 'react';
import Link from 'next/link';

import { Button } from '@workspace/ui/components/button';

import { GridSection } from '~/components/fragments/grid-section';

export function CareersPositions(): React.JSX.Element {
  return (
    <GridSection>
      <div className="space-y-12 py-20">
        <h2 className="text-center text-3xl font-semibold md:text-4xl">
          We&apos;re not hiring yet
        </h2>
        <p className="mx-auto max-w-xl text-center text-muted-foreground">
          We&apos;re a small team focused on shipping V1. When we open roles, they&apos;ll appear
          here.
        </p>
        <div className="flex justify-center">
          <Button asChild variant="default" className="rounded-xl">
            <Link href="/contact">Get in touch</Link>
          </Button>
        </div>
      </div>
    </GridSection>
  );
}
