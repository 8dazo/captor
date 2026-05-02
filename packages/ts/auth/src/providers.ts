import type { OAuthProvider, Provider } from './providers.types.js';

export const providers: Provider[] = [
  { id: 'github', name: 'GitHub' },
  { id: 'google', name: 'Google' },
];

export type { OAuthProvider, Provider };
