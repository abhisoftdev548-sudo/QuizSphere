import type { RequestHandler } from 'express';
import crypto from 'node:crypto';
import { csrfCookieName } from '../services/auth.service.js';
import { ApiError } from '../utils/ApiError.js';

const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS']);

export const csrfProtection: RequestHandler = (req, _res, next) => {
  const hasCookieSession = Boolean(req.cookies?.qs_access || req.cookies?.qs_refresh);
  if (!safeMethods.has(req.method) && hasCookieSession) {
    const cookieToken = String(req.cookies?.[csrfCookieName] ?? '');
    const headerToken = String(req.get('x-csrf-token') ?? '');
    const matches = cookieToken.length > 0 && cookieToken.length === headerToken.length && crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken));
    if (!matches) return next(new ApiError(403, 'Security token missing or invalid. Refresh the page and try again.', 'CSRF_FAILED'));
  }
  next();
};
