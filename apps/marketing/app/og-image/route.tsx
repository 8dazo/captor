import { ImageResponse } from 'next/og';

import { OgImage } from '@workspace/ui/components/og-image';

export const runtime = 'edge';

const variants = {
  home: {
    eyebrow: 'Execution contracts',
    title: 'Captor',
    description: 'Resource limits, checkpoints, and outcome checks for production work.',
  },
  docs: {
    eyebrow: 'Documentation',
    title: 'Build with Captor',
    description:
      'Run the local quickstart, test backfill recovery, and inspect execution receipts.',
  },
  pricing: {
    eyebrow: 'Pricing',
    title: 'Captor pricing',
    description: 'Start locally with the open-source SDK. Explore optional receipt inspection.',
  },
  story: {
    eyebrow: 'Company',
    title: 'Why Captor exists',
    description: 'Bound production jobs before they run and verify their outcomes.',
  },
} as const;

type Variant = keyof typeof variants;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requestedVariant = searchParams.get('variant');
  const variant: Variant =
    requestedVariant && requestedVariant in variants ? (requestedVariant as Variant) : 'home';

  return new ImageResponse(<OgImage {...variants[variant]} />, {
    width: 1200,
    height: 630,
  });
}
