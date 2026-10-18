import { Router } from 'express';
import { optionalAuth } from '../middleware/optionalAuth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { leaderboard } from '../controllers/leaderboard.controller.js';

const router = Router();
router.get('/', optionalAuth, asyncHandler(leaderboard));
export default router;
