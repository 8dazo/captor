export function checkIfCanInvite(): boolean {
  return true;
}

export async function createInvitation(): Promise<{
  id: string;
  token: string;
  expiresAt: Date;
}> {
  throw new Error('Not implemented');
}

export async function sendInvitationRequest(): Promise<void> {
  throw new Error('Not implemented');
}
