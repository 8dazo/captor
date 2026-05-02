import { z } from 'zod';

export const SubmitRecoveryCodeSchema = z.object({
  recoveryCode: z.string().min(1),
});

export const submitRecoveryCodeSchema = SubmitRecoveryCodeSchema;

export const SubmitTotpCodeSchema = z.object({
  totpCode: z.string().min(6).max(6),
});

export const submitTotpCodeSchema = SubmitTotpCodeSchema;
