import { z } from 'zod';

export const registerSchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers and underscore'),
  email: z.string().email(),
  password: z.string().min(6).max(100),
  role: z.enum(['user', 'admin']).optional()
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export const updateProfileSchema = z.object({
  username: z.string().min(3).max(30).optional(),
  bio: z.string().max(500).optional(),
  avatar: z.string().url().optional().or(z.literal('')),
  preferences: z.object({
    emailNotifications: z.boolean().optional(),
    theme: z.enum(['light', 'dark']).optional()
  }).optional()
});
