import * as React from 'react';
import type { Metadata } from 'next';

import { baseUrl } from '@workspace/routes';

import { PricingFAQ } from '~/components/sections/pricing-faq';
import { PricingPlans } from '~/components/sections/pricing-plans';
import { createTitle } from '~/lib/formatters';

const title = createTitle('Pricing');
const description =
  'Start with the open-source Captor SDK and explore optional execution receipt inspection.';
const image = `${baseUrl.Marketing}/og-image?variant=pricing`;

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    url: `${baseUrl.Marketing}/pricing`,
    images: [image],
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: [image],
  },
};

export default function PricingPage(): React.JSX.Element {
  return (
    <>
      <PricingPlans />
      <PricingFAQ />
    </>
  );
}
