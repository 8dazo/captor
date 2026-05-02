export const handlers = {
  GET: () => new Response('Unauthorized', { status: 401 }),
  POST: () => new Response('Unauthorized', { status: 401 }),
};

export async function dedupedAuth() {
  return null;
}

export const signIn = () => {
  throw new Error('Not implemented');
};

export const signOut = () => {
  throw new Error('Not implemented');
};
