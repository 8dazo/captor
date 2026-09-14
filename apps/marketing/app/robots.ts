import type { MetadataRoute } from 'next';

import { baseUrl } from '@workspace/routes';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/'
    },
    host: baseUrl.Marketing,
    sitemap: `${baseUrl.Marketing}/sitemap.xml`
  };
}
