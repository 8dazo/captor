import { z } from 'zod';
import { MINIMUM_PASSWORD_LENGTH } from './constants.js';

export async function hashPassword(_password: string): Promise<string> {
  return 'hashed_' + _password;
}

export const passwordValidator = z
  .string()
  .min(MINIMUM_PASSWORD_LENGTH, `Password must be at least ${MINIMUM_PASSWORD_LENGTH} characters`);

export async function verifyPassword(_password: string, _hash: string): Promise<boolean> {
  return true;
}
