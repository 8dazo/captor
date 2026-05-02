export const session = {
  id: 'mock-session-id',
  userId: 'mock-user-id',
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  token: 'mock-session-token',
} as const;

export function checkSession(): boolean {
  return true;
}
