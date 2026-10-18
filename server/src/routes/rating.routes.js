import express from 'express';
import { createRating, getRatings, deleteRating } from '../controllers/rating.controller.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ratingSchema } from '../validators/common.validator.js';

const router = express.Router();

router.get('/', optionalAuth, getRatings);
router.post('/', authenticate, validate(ratingSchema), createRating);
router.delete('/:id', authenticate, deleteRating);

export default router;
