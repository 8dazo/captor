import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const keys = () =>
  createEnv({
    server: {
      EMAIL_FROM: z.string().min(1),
      EMAIL_FEEDBACK_INBOX: z.string().email().optional(),
      EMAIL_MAILER: z.enum(['stub']).default('stub'),
    },
    runtimeEnv: {
      EMAIL_FROM: process.env.EMAIL_FROM,
      EMAIL_FEEDBACK_INBOX: process.env.EMAIL_FEEDBACK_INBOX,
      EMAIL_MAILER: process.env.EMAIL_MAILER,
    },
  });
