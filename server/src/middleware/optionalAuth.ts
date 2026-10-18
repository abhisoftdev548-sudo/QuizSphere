import type { RequestHandler } from 'express';
import { User } from '../models/User.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { getAccessToken, verifyAccessToken } from '../services/auth.service.js';

export const optionalAuth: RequestHandler = async (req, _res, next) => {
  try {
    const token = getAccessToken(req);
    if (token) {
      const claims = verifyAccessToken(token);
      const [user, session] = await Promise.all([
        User.findById(claims.sub).select('_id role status'),
        RefreshToken.exists({ sessionId: claims.sid, revokedAt: null, expiresAt: { $gt: new Date() } }),
      ]);
      if (user?.status === 'active' && session) req.auth = { userId: String(user._id), role: user.role as 'user' | 'admin' };
    }
  } catch {
    // Public discovery remains available for signed-out or expired sessions.
  }
  next();
};
