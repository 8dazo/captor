import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const keys = createEnv({
  server: {
    AUTH_SECRET: z.string().min(1),
    AUTH_URL: z.string().url().optional(),
  },
  runtimeEnv: {
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_URL: process.env.AUTH_URL,
  },
});
