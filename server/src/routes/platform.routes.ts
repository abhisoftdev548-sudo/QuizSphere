import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getPublicRules } from '../controllers/platform.controller.js';

const router = Router();
router.get('/rules', asyncHandler(getPublicRules));
export default router;
