import * as React from 'react';
import type { Metadata } from 'next';

import { baseUrl } from '@workspace/routes';

import { StoryHero } from '~/components/sections/story-hero';
import { StoryTeam } from '~/components/sections/story-team';
import { StoryTimeline } from '~/components/sections/story-timeline';
import { StoryValues } from '~/components/sections/story-values';
import { StoryVision } from '~/components/sections/story-vision';
import { createTitle } from '~/lib/formatters';

const title = createTitle('Story');
const description =
  'Why Captar exists and how we are building a runtime control layer for production AI applications.';
const image = `${baseUrl.Marketing}/og-image?variant=story`;

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    url: `${baseUrl.Marketing}/story`,
    images: [image]
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: [image]
  }
};

export default function StoryPage(): React.JSX.Element {
  return (
    <>
      <StoryHero />
      <StoryVision />
      <StoryTeam />
      <StoryTimeline />
      <StoryValues />
    </>
  );
}
