import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { forgotPassword, getMe, login, logout, refresh, register, resetPassword } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema } from '../validators/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { issueCsrfToken } from '../services/auth.service.js';
import { sendData } from '../utils/http.js';

const router = Router();
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false, message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many authentication requests. Please try again later.' } } });
const refreshLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 120, standardHeaders: true, legacyHeaders: false });

router.get('/csrf', (_req, res) => {
  sendData(res, { csrfToken: issueCsrfToken(res) });
});
router.post('/register', authLimiter, validateBody(registerSchema), asyncHandler(register));
router.post('/login', authLimiter, validateBody(loginSchema), asyncHandler(login));
router.post('/forgot-password', authLimiter, validateBody(forgotPasswordSchema), asyncHandler(forgotPassword));
router.post('/reset-password', authLimiter, validateBody(resetPasswordSchema), asyncHandler(resetPassword));
router.post('/refresh', refreshLimiter, asyncHandler(refresh));
router.post('/logout', asyncHandler(logout));
router.get('/me', authenticate, asyncHandler(getMe));

export default router;
