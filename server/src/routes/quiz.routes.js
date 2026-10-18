import express from 'express';
import { createQuiz, getQuizzes, getQuizById, updateQuiz, deleteQuiz, reviewQuiz, attemptQuiz, getAttempts, getAttemptById, getMyQuizzes } from '../controllers/quiz.controller.js';
import { authenticate, authorize, optionalAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createQuizSchema, updateQuizSchema, reviewQuizSchema, attemptQuizSchema } from '../validators/quiz.validator.js';
import { createLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.get('/', optionalAuth, getQuizzes);
router.get('/my', authenticate, getMyQuizzes);
router.get('/attempts', authenticate, getAttempts);
router.get('/attempts/:attemptId', authenticate, getAttemptById);
router.get('/:id', optionalAuth, getQuizById);

router.post('/', authenticate, createLimiter, validate(createQuizSchema), createQuiz);
router.put('/:id', authenticate, validate(updateQuizSchema), updateQuiz);
router.delete('/:id', authenticate, deleteQuiz);

router.post('/:id/attempt', authenticate, validate(attemptQuizSchema), attemptQuiz);
router.post('/:id/review', authenticate, authorize('admin'), validate(reviewQuizSchema), reviewQuiz);

export default router;
