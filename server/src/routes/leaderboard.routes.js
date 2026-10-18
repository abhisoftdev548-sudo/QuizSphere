import express from 'express';
import { getLeaderboard, getUserStats } from '../controllers/leaderboard.controller.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/', optionalAuth, getLeaderboard);
router.get('/stats/:userId?', authenticate, getUserStats);

export default router;
