import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { castVote, getMyPollVotes } from '../controllers/poll.controller.js';

const router = Router();
router.use(authenticate);
router.post('/:id/vote', validateBody(z.object({ optionIds: z.array(z.string().regex(/^[a-f\d]{24}$/i)).min(1).max(10) }).strict()), asyncHandler(castVote));
router.get('/me/poll-votes', asyncHandler(getMyPollVotes));
export default router;
