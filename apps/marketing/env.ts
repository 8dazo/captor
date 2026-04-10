import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: {},
  client: {
    NEXT_PUBLIC_MARKETING_URL: z.string().url().optional(),
    NEXT_PUBLIC_PLATFORM_URL: z.string().url().optional()
  },
  runtimeEnv: {
    NEXT_PUBLIC_MARKETING_URL: process.env.NEXT_PUBLIC_MARKETING_URL,
    NEXT_PUBLIC_PLATFORM_URL: process.env.NEXT_PUBLIC_PLATFORM_URL
  }
});
