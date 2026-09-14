import { ImageResponse } from 'next/og';

import { OgImage } from '@workspace/ui/components/og-image';

export const runtime = 'edge';

const variants = {
  home: {
    eyebrow: 'Runtime control',
    title: 'Captar',
    description: 'Runtime control for OpenAI apps, with traces, budgets, tools, and manual review.'
  },
  docs: {
    eyebrow: 'Documentation',
    title: 'Build with Captar',
    description: 'Add runtime budgets, tool guardrails, span-first traces, datasets, and manual evaluation to OpenAI-compatible apps.'
  },
  pricing: {
    eyebrow: 'Pricing',
    title: 'Captar pricing',
    description: 'Explore Captar plans for teams adding runtime controls and trace inspection to production AI applications.'
  },
  story: {
    eyebrow: 'Company',
    title: 'Why Captar exists',
    description: 'We are building the runtime control layer that helps teams keep production AI applications observable, bounded, and reviewable.'
  }
} as const;

type Variant = keyof typeof variants;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requestedVariant = searchParams.get('variant');
  const variant: Variant =
    requestedVariant && requestedVariant in variants
      ? (requestedVariant as Variant)
      : 'home';

  return new ImageResponse(<OgImage {...variants[variant]} />, {
    width: 1200,
    height: 630
  });
}
