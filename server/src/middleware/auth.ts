import type { RequestHandler } from 'express';
import { User } from '../models/User.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { ApiError } from '../utils/ApiError.js';
import { getAccessToken, verifyAccessToken } from '../services/auth.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const authenticate: RequestHandler = asyncHandler(async (req, _res, next) => {
  const token = getAccessToken(req);
  if (!token) throw new ApiError(401, 'Please sign in to continue.', 'AUTH_REQUIRED');
  let claims;
  try { claims = verifyAccessToken(token); } catch { throw new ApiError(401, 'Your session has expired. Please sign in again.', 'SESSION_EXPIRED'); }
  const [user, session] = await Promise.all([
    User.findById(claims.sub).select('_id role status'),
    RefreshToken.exists({ sessionId: claims.sid, revokedAt: null, expiresAt: { $gt: new Date() } }),
  ]);
  if (!user || user.status !== 'active') throw new ApiError(401, 'This account is unavailable.', 'ACCOUNT_UNAVAILABLE');
  if (!session) throw new ApiError(401, 'Your session has been revoked. Please sign in again.', 'SESSION_REVOKED');
  req.auth = { userId: String(user._id), role: user.role as 'user' | 'admin' };
  next();
});

export function requireRole(...roles: Array<'user' | 'admin'>): RequestHandler {
  return (req, _res, next) => {
    if (!req.auth || !roles.includes(req.auth.role)) return next(new ApiError(403, 'You do not have permission to perform this action.', 'FORBIDDEN'));
    next();
  };
}
