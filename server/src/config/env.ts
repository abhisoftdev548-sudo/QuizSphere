import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().default('mongodb://127.0.0.1:27017/quizsphere'),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
  ACCESS_TOKEN_SECRET: z.string().min(32).default('local-only-access-secret-change-me-123456'),
  REFRESH_TOKEN_SECRET: z.string().min(32).default('local-only-refresh-secret-change-me-123456'),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  COOKIE_SAME_SITE: z.preprocess(
    (value) => typeof value === 'string' ? value.trim().toLowerCase() : value,
    z.enum(['strict', 'lax', 'none']),
  ).default(process.env.NODE_ENV === 'production' ? 'none' : 'lax'),
  COOKIE_DOMAIN: z.string().optional(),
  SIGNUP_BONUS_QCOINS: z.coerce.number().int().nonnegative().default(100),
  COOKIE_SECURE: z.string().optional().transform((value) => value === 'true'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default('QuizSphere <no-reply@quizsphere.local>'),
});

export const env = envSchema.parse(process.env);
export const allowedOrigins = env.CLIENT_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean);
