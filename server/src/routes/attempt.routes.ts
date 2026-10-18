import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getAttempt, getAttemptResult, saveAnswers, startAttempt, submitAttempt } from '../controllers/attempt.controller.js';

const router = Router();
router.use(authenticate);
router.post('/quizzes/:id/attempts', asyncHandler(startAttempt));
router.get('/attempts/:id', asyncHandler(getAttempt));
router.put('/attempts/:id/answers', validateBody(z.object({ answers: z.array(z.object({ questionId: z.string().regex(/^[a-f\d]{24}$/i), selections: z.array(z.string().max(60)).max(8).default([]), textAnswer: z.string().max(1000).default('') }).strict()).max(100) }).strict()), asyncHandler(saveAnswers));
router.post('/attempts/:id/submit', asyncHandler(submitAttempt));
router.get('/attempts/:id/result', asyncHandler(getAttemptResult));
export default router;
