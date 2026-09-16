import { type MetadataRoute } from 'next';

import { APP_DESCRIPTION, APP_NAME } from '@workspace/common/app';

export default function Manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: APP_NAME,
    description: APP_DESCRIPTION,
    start_url: '/',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#000000',
    icons: [
      {
        src: '/logo.png',
        sizes: 'any',
        type: 'image/png',
        purpose: 'any'
      }
    ]
  };
}
