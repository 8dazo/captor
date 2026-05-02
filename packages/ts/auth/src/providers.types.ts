export type OAuthProvider = 'github' | 'google';

export const Provider = {
  Credentials: 'credentials',
  Google: 'google',
  Microsoft: 'microsoft',
  TotpCode: 'totp_code',
  RecoveryCode: 'recovery_code',
} as const;
export type Provider = (typeof Provider)[keyof typeof Provider];
