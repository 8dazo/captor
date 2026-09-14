import * as React from 'react';

import { CTA } from '~/components/sections/cta';
import { Hero } from '~/components/sections/hero';
import { ProductPlatform } from '~/components/sections/product-platform';

export default function IndexPage(): React.JSX.Element {
  return (
    <>
      <Hero />
      <ProductPlatform />
      <CTA />
    </>
  );
}
