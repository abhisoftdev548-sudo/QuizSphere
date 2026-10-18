import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email().max(254).transform((value) => value.trim().toLowerCase()),
  username: z.string().trim().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/, 'Use letters, numbers, and underscores only.'),
  displayName: z.string().trim().min(2).max(80),
  password: z.string().min(10).max(128),
}).strict();

export const forgotPasswordSchema = z.object({ email: z.string().email().max(254).transform((value) => value.trim().toLowerCase()) }).strict();
export const resetPasswordSchema = z.object({ token: z.string().min(32).max(128), password: z.string().min(10).max(128) }).strict();

export const loginSchema = z.object({
  email: z.string().email().max(254).transform((value) => value.trim().toLowerCase()),
  password: z.string().min(1).max(128),
}).strict();
