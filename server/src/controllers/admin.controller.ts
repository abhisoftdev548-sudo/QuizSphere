import type { Request, Response } from 'express';
import { Types } from 'mongoose';
import { AdminReview } from '../models/AdminReview.js';
import { AuditLog } from '../models/AuditLog.js';
import { Category } from '../models/Category.js';
import { Notification } from '../models/Notification.js';
import { PlatformConfig } from '../models/PlatformConfig.js';
import { Poll } from '../models/Poll.js';
import { Quiz, QuizVersion } from '../models/Quiz.js';
import { QuizPrizePool, PollPrizePool } from '../models/PrizePool.js';
import { QuizAttempt } from '../models/QuizAttempt.js';
import { QCoinLedger } from '../models/QCoinLedger.js';
import { Report } from '../models/Report.js';
import { User } from '../models/User.js';
import { PASS_PRODUCTS, passProductsOrDefault } from '../constants/passes.js';
import { applyLedgerEntry } from '../services/wallet.service.js';
import { distributePrize } from '../services/prize.service.js';
import { scoreAnswers } from '../services/scoring.service.js';
import { runInTransaction } from '../services/transaction.service.js';
import { ApiError } from '../utils/ApiError.js';
import { sendData, pageNumber } from '../utils/http.js';

export async function adminOverview(_req: Request, res: Response): Promise<void> {
  const [users, activeUsers, quizzes, polls, pendingQuizzes, pendingPolls, openReports, openQuizPools, openPollPools, qcoinTotals] = await Promise.all([
    User.countDocuments(), User.countDocuments({ status: 'active', lastActiveAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }),
    Quiz.countDocuments({ status: 'published' }), Poll.countDocuments({ status: 'published' }),
    Quiz.countDocuments({ status: 'pending_review' }), Poll.countDocuments({ status: 'pending_review' }),
    Report.countDocuments({ status: { $in: ['open', 'reviewing'] } }),
    QuizPrizePool.countDocuments({ status: 'open' }), PollPrizePool.countDocuments({ status: 'open' }),
    QCoinLedger.aggregate([{ $group: { _id: null, issued: { $sum: { $cond: [{ $gt: ['$amount', 0] }, '$amount', 0] } }, spent: { $sum: { $cond: [{ $lt: ['$amount', 0] }, { $abs: '$amount' }, 0] } } } }]),
  ]);
  const recentActions = await AuditLog.find().sort({ createdAt: -1 }).limit(6).populate('actorId', 'username displayName').lean();
  sendData(res, { metrics: { registeredUsers: users, activeUsers30d: activeUsers, publishedQuizzes: quizzes, publishedPolls: polls, pendingReviews: pendingQuizzes + pendingPolls, qcoinsIssued: qcoinTotals[0]?.issued ?? 0, qcoinsSpent: qcoinTotals[0]?.spent ?? 0, openReports, pendingSettlements: openQuizPools + openPollPools }, recentActions });
}

export async function listReviews(req: Request, res: Response): Promise<void> {
  const type = req.query.type === 'poll' ? 'poll' : req.query.type === 'quiz' ? 'quiz' : 'all';
  const status = typeof req.query.status === 'string' ? req.query.status : 'pending_review';
  const page = Math.min(100, pageNumber(req.query.page));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 100) : '';
  const regex = search ? new RegExp(escapeRegex(search), 'i') : undefined;
  const query: Record<string, unknown> = {};
  if (status !== 'all') query.status = status;
  if (regex) query.title = regex;
  const fetchLimit = type === 'all' ? page * limit : limit;
  const skip = type === 'all' ? 0 : (page - 1) * limit;
  const [quizzes, polls, quizTotal, pollTotal] = await Promise.all([
    type === 'poll' ? [] : Quiz.find(query).sort({ updatedAt: 1 }).skip(skip).limit(fetchLimit).populate('creatorId', 'username displayName email').populate('categoryId', 'name').lean(),
    type === 'quiz' ? [] : Poll.find(query).sort({ updatedAt: 1 }).skip(skip).limit(fetchLimit).populate('creatorId', 'username displayName email').populate('categoryId', 'name').lean(),
    type === 'poll' ? 0 : Quiz.countDocuments(query),
    type === 'quiz' ? 0 : Poll.countDocuments(query),
  ]);
  const combined = [
    ...(quizzes as any[]).map((item) => ({ id: String(item._id), type: 'quiz', title: item.title, status: item.status, creator: publicAdminUser(item.creatorId), category: item.categoryId?.name ?? null, questionCount: item.questionCount, entryFee: item.entryFee, updatedAt: item.updatedAt })),
    ...(polls as any[]).map((item) => ({ id: String(item._id), type: 'poll', title: item.title, status: item.status, creator: publicAdminUser(item.creatorId), category: item.categoryId?.name ?? null, optionCount: item.options.length, votingFee: item.votingFee, updatedAt: item.updatedAt })),
  ].sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
  const items = type === 'all' ? combined.slice((page - 1) * limit, page * limit) : combined;
  sendData(res, { items, pagination: { page, limit, total: quizTotal + pollTotal, pages: Math.ceil((quizTotal + pollTotal) / limit) } });
}

export async function reviewDetail(req: Request, res: Response): Promise<void> {
  const { type, id } = req.params;
  if (type === 'quiz') {
    const quiz = await Quiz.findById(id).populate('creatorId', 'username displayName email').populate('categoryId', 'name').lean() as any;
    if (!quiz) throw new ApiError(404, 'Quiz submission not found.', 'CONTENT_NOT_FOUND');
    const version = quiz.currentVersionId ? await QuizVersion.findById(quiz.currentVersionId).lean() as any : null;
    const history = await AdminReview.find({ targetType: 'quiz', targetId: quiz._id }).sort({ createdAt: -1 }).populate('adminId', 'username displayName').lean();
    sendData(res, { item: { id: String(quiz._id), type, title: quiz.title, description: quiz.description, category: quiz.categoryId?.name ?? null, creator: publicAdminUser(quiz.creatorId), status: quiz.status, quizType: quiz.quizType ?? (quiz.closesAt ? 'special_event' : 'general'), difficulty: quiz.difficulty, tags: quiz.tags, questionCount: quiz.questionCount, timeLimitSeconds: quiz.timeLimitSeconds, startsAt: quiz.startsAt ?? null, closesAt: quiz.closesAt, passingScorePercent: quiz.passingScorePercent, entryFee: quiz.entryFee, requiredPassKey: quiz.requiredPassKey ?? null, prizeRules: quiz.prizeRules, creatorFundedPrize: quiz.creatorFundedPrize, rewardPerWinner: quiz.rewardPerWinner ?? 0, reviewFeedback: quiz.reviewFeedback, version: quiz.version, questions: version?.questions ?? [] }, history });
  } else if (type === 'poll') {
    const poll = await Poll.findById(id).populate('creatorId', 'username displayName email').populate('categoryId', 'name').lean() as any;
    if (!poll) throw new ApiError(404, 'Poll submission not found.', 'CONTENT_NOT_FOUND');
    const history = await AdminReview.find({ targetType: 'poll', targetId: poll._id }).sort({ createdAt: -1 }).populate('adminId', 'username displayName').lean();
    sendData(res, { item: { id: String(poll._id), type, title: poll.title, description: poll.description, category: poll.categoryId?.name ?? null, creator: publicAdminUser(poll.creatorId), status: poll.status, tags: poll.tags, options: poll.options.map((option: any) => ({ id: String(option._id), text: option.text })), allowMultiple: poll.allowMultiple, anonymous: poll.anonymous, resultVisibility: poll.resultVisibility, allowVoteChange: poll.allowVoteChange, startsAt: poll.startsAt, closesAt: poll.closesAt, votingFee: poll.votingFee, reward: poll.reward, reviewFeedback: poll.reviewFeedback, version: poll.version }, history });
  } else throw new ApiError(400, 'Content type must be quiz or poll.', 'INVALID_CONTENT_TYPE');
}

export async function decideReview(req: Request, res: Response): Promise<void> {
  const { type, id } = req.params;
  const { decision, note, qualityRating } = req.body as { decision: 'approved' | 'rejected' | 'changes_requested'; note: string; qualityRating?: number };
  if (type !== 'quiz' && type !== 'poll') throw new ApiError(400, 'Content type must be quiz or poll.', 'INVALID_CONTENT_TYPE');
  const feedback = decision === 'approved' ? (note || 'Approved for publication.') : note;
  const reviewed = await runInTransaction(async (session) => {
    const content: any = type === 'quiz' ? await Quiz.findById(id).session(session) : await Poll.findById(id).session(session);
    if (!content) throw new ApiError(404, 'Submission not found.', 'CONTENT_NOT_FOUND');
    if (content.status !== 'pending_review') throw new ApiError(409, 'This submission is not awaiting review.', 'INVALID_CONTENT_STATE');
    content.status = decision;
    content.reviewFeedback = feedback;
    await content.save({ session });
    await AdminReview.create([{ targetType: type, targetId: content._id, contentVersion: content.version, adminId: req.auth!.userId, decision, note: feedback, qualityRating: qualityRating ?? null }], { session });
    await Notification.create([{ userId: content.creatorId, type: decision === 'approved' ? 'submission_approved' : decision === 'rejected' ? 'submission_rejected' : 'changes_requested', title: decision === 'approved' ? 'Submission approved' : decision === 'rejected' ? 'Submission not approved' : 'Changes requested', message: decision === 'approved' ? `“${content.title}” was approved. Publish it from Creator Studio when ready.` : `“${content.title}”: ${feedback}`, link: '/creator-studio', relatedType: type, relatedId: content._id }], { session });
    await AuditLog.create([{ actorId: req.auth!.userId, action: `review_${decision}`, targetType: type, targetId: String(content._id), reason: feedback, ipAddress: req.ip ?? '', metadata: { version: content.version, qualityRating: qualityRating ?? null } }], { session });
    return { id: String(content._id), status: content.status };
  });
  sendData(res, { ...reviewed, type, reviewFeedback: feedback });
}

export async function listUsers(req: Request, res: Response): Promise<void> {
  const page = pageNumber(req.query.page);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
  const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 100) : '';
  const filter: Record<string, unknown> = {};
  if (req.query.status && ['active', 'suspended', 'closed'].includes(String(req.query.status))) filter.status = req.query.status;
  if (req.query.role && ['user', 'admin'].includes(String(req.query.role))) filter.role = req.query.role;
  if (search) {
    const regex = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ email: regex }, { username: regex }, { displayName: regex }];
  }
  const [items, total] = await Promise.all([User.find(filter).select('email username displayName role status walletBalance createdAt lastActiveAt').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(), User.countDocuments(filter)]);
  sendData(res, { items: items.map(publicAdminUser), pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
}

export async function updateUser(req: Request, res: Response): Promise<void> {
  const { status, role, reason } = req.body as { status?: string; role?: string; reason: string };
  if (String(req.params.id) === req.auth!.userId && (status === 'suspended' || role === 'user')) throw new ApiError(409, 'You cannot suspend or demote your own administrator account.', 'SELF_ADMIN_CHANGE');
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found.', 'USER_NOT_FOUND');
  if (status && ['active', 'suspended', 'closed'].includes(status)) user.status = status as any;
  if (role && ['user', 'admin'].includes(role)) user.role = role as any;
  await user.save();
  if (status && status !== 'active') await import('../models/RefreshToken.js').then(({ RefreshToken }) => RefreshToken.updateMany({ userId: user._id, revokedAt: null }, { $set: { revokedAt: new Date() } }));
  await AuditLog.create({ actorId: req.auth!.userId, action: 'user_account_updated', targetType: 'user', targetId: String(user._id), reason, ipAddress: req.ip ?? '', metadata: { status: user.status, role: user.role } });
  sendData(res, { user: publicAdminUser(user) });
}

export async function getPlatformConfig(_req: Request, res: Response): Promise<void> {
  const config = await PlatformConfig.findById('global').lean();
  sendData(res, { config: { _id: 'global', signupBonus: 100, freeQuizQuestionLimit: 10, specialEventRequiresCreatePass: true, additionalQuestionFee: 0, maxQuizEntryFee: 500, maxPollVoteFee: 100, maxQuizQuestions: 50, ...config, passProducts: passProductsOrDefault(config?.passProducts as any) } });
}

export async function updatePlatformConfig(req: Request, res: Response): Promise<void> {
  const updates = req.body as Record<string, unknown>;
  const current = await PlatformConfig.findById('global').lean();
  const config = await PlatformConfig.findOneAndUpdate({ _id: 'global' }, { $set: { ...updates, updatedBy: req.auth!.userId } }, { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true });
  await AuditLog.create({ actorId: req.auth!.userId, action: 'platform_pricing_updated', targetType: 'platform_config', targetId: 'global', reason: 'Platform pricing and limits updated.', ipAddress: req.ip ?? '', metadata: { before: current ?? null, after: updates } });
  sendData(res, { config });
}

export async function listCategories(_req: Request, res: Response): Promise<void> {
  sendData(res, { items: await Category.find().sort({ contentType: 1, name: 1 }).lean() });
}

export async function createCategory(req: Request, res: Response): Promise<void> {
  const data = req.body as { name: string; slug: string; contentType: 'quiz' | 'poll' | 'both'; description?: string; parentId?: string | null };
  const category = await Category.create({ ...data, parentId: data.parentId || null });
  await AuditLog.create({ actorId: req.auth!.userId, action: 'category_created', targetType: 'category', targetId: String(category._id), reason: 'Category created.', ipAddress: req.ip ?? '' });
  sendData(res, { item: category }, 201);
}

export async function updateCategory(req: Request, res: Response): Promise<void> {
  const data = req.body as { name?: string; slug?: string; contentType?: 'quiz' | 'poll' | 'both'; description?: string; parentId?: string | null; isActive?: boolean };
  const category = await Category.findByIdAndUpdate(req.params.id, { $set: data }, { new: true, runValidators: true });
  if (!category) throw new ApiError(404, 'Category not found.', 'CATEGORY_NOT_FOUND');
  await AuditLog.create({ actorId: req.auth!.userId, action: 'category_updated', targetType: 'category', targetId: String(category._id), reason: 'Category settings updated.', ipAddress: req.ip ?? '' });
  sendData(res, { item: category });
}

export async function listLedger(req: Request, res: Response): Promise<void> {
  const page = pageNumber(req.query.page);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
  const filter: Record<string, unknown> = {};
  if (typeof req.query.userId === 'string' && Types.ObjectId.isValid(req.query.userId)) filter.userId = req.query.userId;
  if (typeof req.query.type === 'string') filter.type = req.query.type;
  const [items, total] = await Promise.all([QCoinLedger.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate('userId', 'username email displayName').lean(), QCoinLedger.countDocuments(filter)]);
  sendData(res, { items: items.map((item: any) => ({ id: String(item._id), user: publicAdminUser(item.userId), amount: item.amount, type: item.type, description: item.description, relatedType: item.relatedType, relatedId: item.relatedId ? String(item.relatedId) : null, idempotencyKey: item.idempotencyKey, createdAt: item.createdAt })), pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
}

export async function adjustWallet(req: Request, res: Response): Promise<void> {
  const { userId, amount, reason } = req.body as { userId: string; amount: number; reason: string };
  const key = req.get('idempotency-key')?.trim();
  if (!key || key.length > 120) throw new ApiError(400, 'An Idempotency-Key header is required for wallet adjustments.', 'IDEMPOTENCY_KEY_REQUIRED');
  const ledger = await runInTransaction(async (session) => {
    const idempotencyKey = `admin-adjustment:${key}`;
    const entry = await applyLedgerEntry({ userId, amount, type: 'admin_adjustment', idempotencyKey, description: reason, relatedType: 'admin', referenceId: req.auth!.userId }, session);
    const existingLog = await AuditLog.findOne({ idempotencyKey }).session(session);
    if (existingLog && (existingLog.targetId !== userId || existingLog.reason !== reason)) throw new ApiError(409, 'This idempotency key was already used for a different adjustment.', 'IDEMPOTENCY_CONFLICT');
    if (!existingLog) await AuditLog.create([{ idempotencyKey, actorId: req.auth!.userId, action: 'qcoin_manual_adjustment', targetType: 'user', targetId: userId, reason, ipAddress: req.ip ?? '', metadata: { ledgerId: String(entry._id), amount } }], { session });
    return entry;
  });
  sendData(res, { transactionId: String(ledger._id), userId, amount, description: ledger.description }, 201);
}

export async function getSettlements(_req: Request, res: Response): Promise<void> {
  const [quizzes, polls] = await Promise.all([QuizPrizePool.find().sort({ updatedAt: -1 }).populate('quizId', 'title status quizType closesAt').lean(), PollPrizePool.find().sort({ updatedAt: -1 }).populate('pollId', 'title status').lean()]);
  sendData(res, { items: [...quizzes.map((item: any) => ({ id: String(item._id), type: 'quiz', quizType: item.quizId?.quizType ?? (item.quizId?.closesAt ? 'special_event' : 'general'), contentId: item.quizId?._id ? String(item.quizId._id) : null, title: item.quizId?.title ?? 'Unavailable quiz', closesAt: item.quizId?.closesAt ?? null, status: item.status, fundedAmount: item.fundedAmount, paidAmount: item.paidAmount ?? 0, collectedFees: item.collectedEntryFees, settledAmount: item.settledAmount, refundedAmount: item.refundedAmount ?? 0, updatedAt: item.updatedAt })), ...polls.map((item: any) => ({ id: String(item._id), type: 'poll', contentId: item.pollId?._id ? String(item.pollId._id) : null, title: item.pollId?.title ?? 'Unavailable poll', closesAt: null, status: item.status, fundedAmount: item.fundedAmount, paidAmount: 0, collectedFees: item.collectedVotingFees, settledAmount: item.settledAmount, refundedAmount: 0, updatedAt: item.updatedAt }))] });
}

export async function settleQuizPrize(req: Request, res: Response): Promise<void> {
  const result = await runInTransaction(async (session) => {
    const quiz = await Quiz.findById(req.params.id).session(session);
    if (!quiz || quiz.status !== 'published') throw new ApiError(404, 'Published quiz not found.', 'CONTENT_NOT_FOUND');
    const pool = await QuizPrizePool.findOne({ quizId: quiz._id }).session(session);
    if (pool?.status === 'settled') return { quizId: String(quiz._id), settledAmount: pool.settledAmount, refundedAmount: pool.refundedAmount, winners: 0, alreadySettled: true };
    if (!pool || pool.status !== 'open') throw new ApiError(409, 'This quiz has no open prize pool.', 'PRIZE_POOL_UNAVAILABLE');
    const quizType = quiz.quizType ?? (quiz.closesAt ? 'special_event' : 'general');
    if (quizType === 'general') {
      const refundedAmount = Math.max(0, pool.fundedAmount - (pool.paidAmount ?? 0));
      if (refundedAmount > 0) {
        await applyLedgerEntry({
          userId: quiz.creatorId,
          amount: refundedAmount,
          type: 'refund',
          idempotencyKey: `quiz-prize-refund:${quiz._id}`,
          description: `Unused general quiz prize pool for “${quiz.title}”`,
          relatedType: 'quiz',
          relatedId: quiz._id,
        }, session);
      }
      pool.status = 'settled';
      pool.settledAmount = pool.paidAmount ?? 0;
      pool.refundedAmount = refundedAmount;
      pool.settledAt = new Date();
      pool.settlementKey = `quiz-settlement:${quiz._id}`;
      await pool.save({ session });
      const summary = { quizId: String(quiz._id), settledAmount: pool.settledAmount, refundedAmount, winners: 0, alreadySettled: false };
      await AuditLog.create([{
        actorId: req.auth!.userId,
        action: 'quiz_prize_settled',
        targetType: 'quiz',
        targetId: summary.quizId,
        reason: 'Remaining General Quiz prize pool was refunded.',
        ipAddress: req.ip ?? '',
        metadata: summary,
      }], { session });
      return summary;
    }
    if (!quiz.closesAt || quiz.closesAt.getTime() > Date.now()) throw new ApiError(409, 'The quiz must reach its closing time before prize settlement.', 'QUIZ_NOT_CLOSED');
    const activeAttempts = await QuizAttempt.find({ quizId: quiz._id, status: 'in_progress' }).session(session);
    if (activeAttempts.length > 0) {
      const versions = new Map<string, any>();
      for (const attempt of activeAttempts) {
        const versionId = String(attempt.quizVersionId);
        let version = versions.get(versionId);
        if (!version) {
          version = await QuizVersion.findById(attempt.quizVersionId).session(session);
          if (!version) throw new ApiError(409, 'An active attempt references an unavailable quiz version.', 'QUIZ_VERSION_NOT_FOUND');
          versions.set(versionId, version);
        }
        const scored = scoreAnswers(version.questions as any[], attempt.answers as any[]);
        attempt.status = 'expired';
        attempt.score = scored.percent;
        attempt.maxScore = scored.maxScore;
        attempt.correctCount = scored.correctCount;
        attempt.passed = scored.percent >= quiz.passingScorePercent;
        attempt.submittedAt = new Date();
        await attempt.save({ session });
        await Notification.create([{
          userId: attempt.userId,
          type: 'result_available',
          title: 'Your quiz result is ready',
          message: `Your attempt for “${quiz.title}” was finalized when the quiz closed.`,
          link: `/attempts/${attempt._id}`,
          relatedType: 'attempt',
          relatedId: attempt._id,
        }], { session });
      }
    }
    const attempts = await QuizAttempt.find({ quizId: quiz._id, status: { $in: ['completed', 'expired'] }, passed: true })
      .sort({ score: -1, submittedAt: 1, _id: 1 }).session(session);
    const bestAttemptByUser = new Map<string, typeof attempts[number]>();
    for (const attempt of attempts) {
      const userId = String(attempt.userId);
      if (!bestAttemptByUser.has(userId)) bestAttemptByUser.set(userId, attempt);
    }
    const winners = distributePrize(quiz.prizeRules, [...bestAttemptByUser.values()].map((attempt) => ({ id: String(attempt._id), userId: String(attempt.userId), score: attempt.score ?? 0 })), pool.fundedAmount);
    let settledAmount = 0;
    for (const winner of winners) {
      if (winner.amount <= 0) continue;
      await applyLedgerEntry({
        userId: winner.userId,
        amount: winner.amount,
        type: 'prize_payout',
        idempotencyKey: `quiz-prize:${quiz._id}:${winner.attemptId}`,
        description: `Prize for rank ${winner.rank} in “${quiz.title}”`,
        relatedType: 'quiz',
        relatedId: quiz._id,
      }, session);
      await Notification.create([{
        userId: winner.userId,
        type: 'qcoin_earned',
        title: 'Quiz prize received',
        message: `You earned ${winner.amount} QCoins for rank ${winner.rank} in “${quiz.title}”.`,
        link: '/app/wallet',
        relatedType: 'quiz',
        relatedId: quiz._id,
      }], { session });
      settledAmount += winner.amount;
    }
    const refundedAmount = pool.fundedAmount - settledAmount;
    if (refundedAmount > 0) {
      await applyLedgerEntry({
        userId: quiz.creatorId,
        amount: refundedAmount,
        type: 'refund',
        idempotencyKey: `quiz-prize-refund:${quiz._id}`,
        description: `Unawarded prize balance for “${quiz.title}”`,
        relatedType: 'quiz',
        relatedId: quiz._id,
      }, session);
    }
    pool.status = 'settled';
    pool.settledAmount = settledAmount;
    pool.refundedAmount = refundedAmount;
    pool.settledAt = new Date();
    pool.settlementKey = `quiz-settlement:${quiz._id}`;
    await pool.save({ session });
    const summary = { quizId: String(quiz._id), settledAmount, refundedAmount, winners: winners.filter((winner) => winner.amount > 0).length, alreadySettled: false };
    await AuditLog.create([{
      actorId: req.auth!.userId,
      action: 'quiz_prize_settled',
      targetType: 'quiz',
      targetId: summary.quizId,
      reason: 'Quiz prize pool was settled.',
      ipAddress: req.ip ?? '',
      metadata: summary,
    }], { session });
    return summary;
  });
  sendData(res, result);
}

export async function listAuditLogs(req: Request, res: Response): Promise<void> {
  const page = pageNumber(req.query.page);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));
  const [items, total] = await Promise.all([AuditLog.find().sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate('actorId', 'username displayName').lean(), AuditLog.countDocuments()]);
  sendData(res, { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
}

function publicAdminUser(user: any) {
  if (!user) return null;
  return { id: String(user._id), email: user.email, username: user.username, displayName: user.displayName, role: user.role, status: user.status, walletBalance: user.walletBalance, createdAt: user.createdAt, lastActiveAt: user.lastActiveAt };
}

function escapeRegex(value: string): string { return value.replace(/[.*+?^${}()|[\]\\]/g, (match) => `\\${match}`); }
