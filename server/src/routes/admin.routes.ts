import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { adjustWallet, adminOverview, createCategory, decideReview, getPlatformConfig, getSettlements, listAuditLogs, listCategories, listLedger, listReviews, listUsers, reviewDetail, settleQuizPrize, suspendPublishedQuiz, updateCategory, updatePlatformConfig, updateUser } from '../controllers/admin.controller.js';
import { PASS_PRODUCTS } from '../constants/passes.js';

const router = Router();
router.use(authenticate, requireRole('admin'));
router.get('/overview', asyncHandler(adminOverview));
router.get('/reviews', asyncHandler(listReviews));
router.get('/reviews/:type/:id', asyncHandler(reviewDetail));
router.post('/reviews/:type/:id/decision', validateBody(z.object({ decision: z.enum(['approved', 'rejected', 'changes_requested']), note: z.string().trim().max(1000).default(''), qualityRating: z.number().int().min(1).max(5).optional() }).strict().superRefine((value, context) => {
  if (value.decision !== 'approved' && value.note.length < 5) context.addIssue({ code: z.ZodIssueCode.custom, path: ['note'], message: 'Provide clear feedback for this decision.' });
})), asyncHandler(decideReview));
router.post('/quizzes/:id/suspend', validateBody(z.object({ reason: z.string().trim().min(5).max(1000) }).strict()), asyncHandler(suspendPublishedQuiz));
router.get('/users', asyncHandler(listUsers));
router.patch('/users/:id', validateBody(z.object({ status: z.enum(['active', 'suspended', 'closed']).optional(), role: z.enum(['user', 'admin']).optional(), reason: z.string().trim().min(5).max(1000) }).strict()), asyncHandler(updateUser));
router.get('/config', asyncHandler(getPlatformConfig));
router.put('/config', validateBody(z.object({ signupBonus: z.number().int().min(0).max(100000), freeQuizQuestionLimit: z.number().int().min(1).max(100), specialEventRequiresCreatePass: z.boolean(), maxQuizEntryFee: z.number().int().min(0).max(100000), maxPollVoteFee: z.number().int().min(0).max(100000), maxQuizQuestions: z.number().int().min(1).max(100), passProducts: z.array(z.object({ key: z.enum(PASS_PRODUCTS.map((item) => item.key) as [string, ...string[]]), name: z.string().trim().min(2).max(40), kind: z.enum(['create', 'participation']), price: z.number().int().min(0).max(100000), buybackPrice: z.number().int().min(0).max(100000), active: z.boolean() }).strict()).length(PASS_PRODUCTS.length) }).strict().superRefine((value, context) => {
  if (value.freeQuizQuestionLimit > value.maxQuizQuestions) context.addIssue({ code: z.ZodIssueCode.custom, path: ['freeQuizQuestionLimit'], message: 'Free question limit cannot exceed the maximum quiz size.' });
  if (new Set(value.passProducts.map((product) => product.key)).size !== PASS_PRODUCTS.length) context.addIssue({ code: z.ZodIssueCode.custom, path: ['passProducts'], message: 'Each pass product must appear exactly once.' });
  for (const product of value.passProducts) {
    const expected = PASS_PRODUCTS.find((item) => item.key === product.key);
    if (!expected || expected.kind !== product.kind) context.addIssue({ code: z.ZodIssueCode.custom, path: ['passProducts'], message: 'Pass keys and pass types cannot be changed.' });
  }
})), asyncHandler(updatePlatformConfig));
router.get('/categories', asyncHandler(listCategories));
router.post('/categories', validateBody(z.object({ name: z.string().trim().min(2).max(60), slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80), contentType: z.enum(['quiz', 'poll', 'both']), description: z.string().trim().max(200).optional().default(''), parentId: z.string().regex(/^[a-f\d]{24}$/i).nullable().optional() }).strict()), asyncHandler(createCategory));
router.patch('/categories/:id', validateBody(z.object({ name: z.string().trim().min(2).max(60).optional(), slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80).optional(), contentType: z.enum(['quiz', 'poll', 'both']).optional(), description: z.string().trim().max(200).optional(), parentId: z.string().regex(/^[a-f\d]{24}$/i).nullable().optional(), isActive: z.boolean().optional() }).strict()), asyncHandler(updateCategory));
router.get('/ledger', asyncHandler(listLedger));
router.post('/ledger/adjust', validateBody(z.object({ userId: z.string().regex(/^[a-f\d]{24}$/i), amount: z.number().int().min(-1000000).max(1000000).refine((value) => value !== 0), reason: z.string().trim().min(5).max(300) }).strict()), asyncHandler(adjustWallet));
router.get('/settlements', asyncHandler(getSettlements));
router.post('/settlements/quizzes/:id/settle', asyncHandler(settleQuizPrize));
router.get('/audit-logs', asyncHandler(listAuditLogs));
export default router;
