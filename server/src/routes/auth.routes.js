import express from 'express';
import { register, login, logout, me, updateProfile } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { registerSchema, loginSchema, updateProfileSchema } from '../validators/auth.validator.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/logout', logout);
router.get('/me', authenticate, me);
router.put('/profile', authenticate, validate(updateProfileSchema), updateProfile);

export default router;
