import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { optionalAuth } from '../middleware/optionalAuth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { explore, getCategories, pollDetail, quizDetail, quizPrivatePreview } from '../controllers/explore.controller.js';

const router = Router();
router.get('/categories', asyncHandler(getCategories));
router.get('/', optionalAuth, asyncHandler(explore));
router.get('/quizzes/:id', optionalAuth, asyncHandler(quizDetail));
router.get('/polls/:id', optionalAuth, asyncHandler(pollDetail));
router.get('/quizzes/:id/creator-preview', authenticate, asyncHandler(quizPrivatePreview));
export default router;
