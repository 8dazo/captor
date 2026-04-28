import bcrypt from 'bcryptjs';
import NextAuth, { type NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { z } from 'zod';

import { prisma } from './lib/db';

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(3),
});

const authConfig = {
  adapter: PrismaAdapter(prisma),
  secret:
    process.env.AUTH_SECRET ??
    (process.env.NODE_ENV === 'development' ? 'captar-local-dev-secret' : undefined),
  session: {
    strategy: 'jwt',
  },
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      authorize: async (rawCredentials) => {
        const credentials = credentialsSchema.safeParse(rawCredentials);
        if (!credentials.success) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.data.email },
        });

        if (!user?.passwordHash) {
          return null;
        }

        const valid = await bcrypt.compare(credentials.data.password, user.passwordHash);

        if (!valid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user?.id) {
        token.sub = user.id;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user) {
        session.user.id = token.sub ?? '';
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

const authResult: ReturnType<typeof NextAuth> = NextAuth(authConfig);

export const handlers = authResult.handlers;
export const auth: typeof authResult.auth = authResult.auth;
export const signIn: typeof authResult.signIn = authResult.signIn;
export const signOut: typeof authResult.signOut = authResult.signOut;
