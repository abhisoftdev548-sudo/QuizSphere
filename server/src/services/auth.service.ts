import crypto from 'node:crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import type { Request, Response } from 'express';
import { env } from '../config/env.js';
import { RefreshToken } from '../models/RefreshToken.js';

export type AccessClaims = { sub: string; role: 'user' | 'admin'; sid: string };
export type RefreshClaims = { sub: string; sid: string; jti: string; family: string };
const accessCookie = 'qs_access';
const refreshCookie = 'qs_refresh';
const csrfCookie = 'qs_csrf';
const cookieSettings = {
  secure: env.COOKIE_SECURE || env.NODE_ENV === 'production' || env.COOKIE_SAME_SITE === 'none',
  sameSite: env.COOKIE_SAME_SITE,
  path: '/',
  ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
};

function digest(token: string): string { return crypto.createHash('sha256').update(token).digest('hex'); }

export function createAccessToken(user: { _id: unknown; role: 'user' | 'admin' }, sessionId: string): string {
  return jwt.sign({ sub: String(user._id), role: user.role, sid: sessionId } satisfies AccessClaims, env.ACCESS_TOKEN_SECRET, { expiresIn: env.ACCESS_TOKEN_TTL as SignOptions['expiresIn'] });
}

export function issueCsrfToken(res: Response): string {
  const token = crypto.randomBytes(24).toString('hex');
  res.cookie(csrfCookie, token, { ...cookieSettings, httpOnly: false, maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000 });
  return token;
}

export function issueAccessCookie(user: { _id: unknown; role: 'user' | 'admin' }, sessionId: string, res: Response): void {
  res.cookie(accessCookie, createAccessToken(user, sessionId), { ...cookieSettings, httpOnly: true, maxAge: 15 * 60 * 1000 });
}

export async function issueSession(user: { _id: unknown; role: 'user' | 'admin' }, req: Request, res: Response, familyId: string = crypto.randomUUID()): Promise<string> {
  const sessionId = crypto.randomUUID();
  const jti = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  const refreshToken = jwt.sign({ sub: String(user._id), sid: sessionId, jti, family: familyId } satisfies RefreshClaims, env.REFRESH_TOKEN_SECRET, { expiresIn: `${env.REFRESH_TOKEN_TTL_DAYS}d` });
  const storedSession = await RefreshToken.create({ userId: user._id, sessionId, tokenHash: digest(refreshToken), familyId, expiresAt, userAgent: req.get('user-agent') ?? '', ipAddress: req.ip ?? '' });
  issueAccessCookie(user, sessionId, res);
  res.cookie(refreshCookie, refreshToken, { ...cookieSettings, httpOnly: true, maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000 });
  issueCsrfToken(res);
  return String(storedSession._id);
}

export function clearAuthCookies(res: Response): void {
  for (const name of [accessCookie, refreshCookie, csrfCookie]) res.clearCookie(name, { ...cookieSettings, httpOnly: name !== csrfCookie });
}

export function getAccessToken(req: Request): string | undefined {
  if (req.cookies?.[accessCookie]) return String(req.cookies[accessCookie]);
  const authHeader = req.get('authorization');
  return authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
}

export function getRefreshToken(req: Request): string | undefined {
  return req.cookies?.[refreshCookie] ? String(req.cookies[refreshCookie]) : undefined;
}

export function verifyAccessToken(token: string): AccessClaims {
  return jwt.verify(token, env.ACCESS_TOKEN_SECRET) as AccessClaims;
}

export function verifyRefreshToken(token: string): RefreshClaims {
  return jwt.verify(token, env.REFRESH_TOKEN_SECRET) as RefreshClaims;
}

export function hashToken(token: string): string { return digest(token); }
export const csrfCookieName = csrfCookie;
