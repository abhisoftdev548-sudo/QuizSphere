import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { listPasses, purchasePass, sellPass } from '../controllers/pass.controller.js';

const router = Router();
router.use(authenticate);
router.get('/', asyncHandler(listPasses));
router.post('/:passKey/purchase', asyncHandler(purchasePass));
router.post('/sell', validateBody(z.object({ passKey: z.enum(['create', 'vip', 'pro', 'legend', 'premium']) }).strict()), asyncHandler(sellPass));
export default router;
