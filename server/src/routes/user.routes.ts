import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getAttempts, getNotifications, getOverview, getWallet, getWalletTransactions, markNotificationRead, updateProfile } from '../controllers/user.controller.js';

const router = Router();
router.use(authenticate);
router.get('/me/overview', asyncHandler(getOverview));
router.get('/me/attempts', asyncHandler(getAttempts));
router.get('/me/notifications', asyncHandler(getNotifications));
router.patch('/me/notifications/:id/read', asyncHandler(markNotificationRead));
router.get('/me/wallet', asyncHandler(getWallet));
router.get('/me/wallet/transactions', asyncHandler(getWalletTransactions));
router.patch('/me/profile', validateBody(z.object({ displayName: z.string().trim().min(2).max(80).optional(), bio: z.string().trim().max(300).optional() }).strict()), asyncHandler(updateProfile));

export default router;
