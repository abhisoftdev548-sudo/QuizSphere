import express from 'express';
import { createPoll, getPolls, getPollById, updatePoll, deletePoll, votePoll, reviewPoll, getMyPolls, getCreatorAnalytics } from '../controllers/poll.controller.js';
import { authenticate, authorize, optionalAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createPollSchema, updatePollSchema, reviewPollSchema, votePollSchema } from '../validators/poll.validator.js';
import { createLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.get('/', optionalAuth, getPolls);
router.get('/my', authenticate, getMyPolls);
router.get('/analytics', authenticate, getCreatorAnalytics);
router.get('/:id', optionalAuth, getPollById);

router.post('/', authenticate, createLimiter, validate(createPollSchema), createPoll);
router.put('/:id', authenticate, validate(updatePollSchema), updatePoll);
router.delete('/:id', authenticate, deletePoll);

router.post('/:id/vote', authenticate, validate(votePollSchema), votePoll);
router.post('/:id/review', authenticate, authorize('admin'), validate(reviewPollSchema), reviewPoll);

export default router;
