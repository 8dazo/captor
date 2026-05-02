import { env, createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const keys = () =>
  createEnv({
    client: {
      NEXT_PUBLIC_DASHBOARD_URL: z.string().url(),
      NEXT_PUBLIC_MARKETING_URL: z.string().url(),
    },
    runtimeEnv: {
      NEXT_PUBLIC_DASHBOARD_URL: env.NEXT_PUBLIC_DASHBOARD_URL,
      NEXT_PUBLIC_MARKETING_URL: env.NEXT_PUBLIC_MARKETING_URL,
    },
  });
