export async function createOtpTokens(): Promise<{
  otp: string;
  token: string;
}> {
  throw new Error('Not implemented');
}

export async function findVerificationTokenFromOtp(): Promise<{
  id: string;
  identifier: string;
  token: string;
  expires: Date;
} | null> {
  throw new Error('Not implemented');
}

export async function verifyEmail(): Promise<boolean> {
  throw new Error('Not implemented');
}
