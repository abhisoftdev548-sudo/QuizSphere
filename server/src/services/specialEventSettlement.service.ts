import { Types } from 'mongoose';
import { AuditLog } from '../models/AuditLog.js';
import { Notification } from '../models/Notification.js';
import { Quiz } from '../models/Quiz.js';
import { QuizAttempt } from '../models/QuizAttempt.js';
import { QuizPrizePool } from '../models/PrizePool.js';
import { QuizVersion } from '../models/Quiz.js';
import { User } from '../models/User.js';
import { distributePrize } from './prize.service.js';
import { scoreAnswers } from './scoring.service.js';
import { runInTransaction } from './transaction.service.js';
import { applyLedgerEntry } from './wallet.service.js';
import { ApiError } from '../utils/ApiError.js';

export async function settleSpecialEventPrize(quizId: string, actorId?: string, ipAddress = '') {
  return runInTransaction(async (session) => {
    const quiz = await Quiz.findById(quizId).session(session);
    const quizType = quiz?.quizType ?? (quiz?.closesAt ? 'special_event' : 'general');
    if (!quiz || !['published', 'suspended'].includes(quiz.status) || quizType !== 'special_event' || !quiz.closesAt) {
      throw new ApiError(404, 'Closed Special Event quiz not found.', 'CONTENT_NOT_FOUND');
    }
    if (quiz.closesAt.getTime() > Date.now()) {
      throw new ApiError(409, 'The quiz must reach its closing time before prize settlement.', 'QUIZ_NOT_CLOSED');
    }

    const activeAttempts = await QuizAttempt.find({ quizId: quiz._id, status: 'in_progress' }).session(session);
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
      attempt.submittedAt = quiz.closesAt;
      await attempt.save({ session });
      await Notification.create([{
        userId: attempt.userId,
        type: 'result_available',
        title: 'Your quiz result is ready',
        message: `Your attempt for “${quiz.title}” was finalized when the event closed.`,
        link: `/attempts/${attempt._id}`,
        relatedType: 'attempt',
        relatedId: attempt._id,
      }], { session });
    }

    const pool = await QuizPrizePool.findOne({ quizId: quiz._id }).session(session);
    if (!pool || pool.status === 'settled') {
      return {
        quizId: String(quiz._id),
        settledAmount: pool?.settledAmount ?? 0,
        refundedAmount: pool?.refundedAmount ?? 0,
        winners: 0,
        alreadySettled: Boolean(pool?.status === 'settled'),
      };
    }
    if (pool.status !== 'open') throw new ApiError(409, 'This quiz has no open prize pool.', 'PRIZE_POOL_UNAVAILABLE');

    const attempts = await QuizAttempt.find({ quizId: quiz._id, status: { $in: ['completed', 'expired'] }, passed: true })
      .sort({ score: -1, submittedAt: 1, _id: 1 }).session(session);
    const bestAttemptByUser = new Map<string, typeof attempts[number]>();
    for (const attempt of attempts) {
      const userId = String(attempt.userId);
      if (!bestAttemptByUser.has(userId)) bestAttemptByUser.set(userId, attempt);
    }
    const winners = distributePrize(
      quiz.prizeRules,
      [...bestAttemptByUser.values()].map((attempt) => ({ id: String(attempt._id), userId: String(attempt.userId), score: attempt.score ?? 0 })),
      pool.fundedAmount,
    );
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
      await Notification.create([{
        userId: quiz.creatorId,
        type: 'qcoin_earned',
        title: 'Unused event prize returned',
        message: `${refundedAmount} QCoins from “${quiz.title}” were returned because they were not awarded.`,
        link: '/app/wallet',
        relatedType: 'quiz',
        relatedId: quiz._id,
      }], { session });
    }

    pool.status = 'settled';
    pool.settledAmount = settledAmount;
    pool.refundedAmount = refundedAmount;
    pool.settledAt = new Date();
    pool.settlementKey = `quiz-settlement:${quiz._id}`;
    await pool.save({ session });
    const summary = { quizId: String(quiz._id), settledAmount, refundedAmount, winners: winners.filter((winner) => winner.amount > 0).length, alreadySettled: false };
    await AuditLog.create([{
      actorId: actorId ? new Types.ObjectId(actorId) : null,
      action: actorId ? 'quiz_prize_settled' : 'special_event_auto_settled',
      targetType: 'quiz',
      targetId: summary.quizId,
      reason: actorId ? 'Quiz prize pool was settled.' : 'Special Event prize pool was automatically settled after the event closed.',
      ipAddress,
      metadata: summary,
    }], { session });
    return summary;
  });
}

export async function settleDueSpecialEventPrizes(): Promise<number> {
  const now = new Date();
  const pools = await QuizPrizePool.find({ status: 'open' }).select('quizId').lean();
  let settledCount = 0;
  for (const pool of pools) {
    const quiz = await Quiz.findOne({
      _id: pool.quizId,
      status: { $in: ['published', 'suspended'] },
      $or: [{ quizType: 'special_event' }, { quizType: null, closesAt: { $ne: null } }],
      closesAt: { $lte: now },
    }).select('_id').lean();
    if (!quiz) continue;
    try {
      const result = await settleSpecialEventPrize(String(quiz._id));
      if (!result.alreadySettled) settledCount += 1;
    } catch (error) {
      console.error(`Unable to settle Special Event prize for quiz ${quiz._id}.`, error);
    }
  }
  return settledCount;
}

export async function getSpecialEventResults(quizId: string) {
  const quiz = await Quiz.findOne({ _id: quizId, status: 'published' }).select('quizType closesAt title passingScorePercent').lean() as any;
  const quizType = quiz?.quizType ?? (quiz?.closesAt ? 'special_event' : 'general');
  if (!quiz || quizType !== 'special_event' || !quiz.closesAt) throw new ApiError(404, 'Special Event results are not available.', 'CONTENT_NOT_FOUND');
  if (quiz.closesAt > new Date()) throw new ApiError(409, 'Special Event results will be available after the quiz closes.', 'RESULTS_PENDING');
  await settleSpecialEventPrize(quizId);

  const attempts = await QuizAttempt.find({ quizId: quiz._id, status: { $in: ['completed', 'expired'] }, score: { $ne: null } })
    .sort({ score: -1, submittedAt: 1, _id: 1 }).select('userId score passed submittedAt').lean() as any[];
  const bestByUser = new Map<string, any>();
  for (const attempt of attempts) {
    const userId = String(attempt.userId);
    if (!bestByUser.has(userId)) bestByUser.set(userId, attempt);
  }
  const rows = [...bestByUser.entries()].map(([userId, attempt]) => ({ userId, score: attempt.score ?? 0, passed: Boolean(attempt.passed), submittedAt: attempt.submittedAt }));
  const eligible = rows.filter((row) => row.passed);
  let currentRank = 0;
  let previousScore: number | null = null;
  const rankByUser = new Map<string, number>();
  eligible.forEach((row, index) => {
    if (row.score !== previousScore) currentRank = index + 1;
    rankByUser.set(row.userId, currentRank);
    previousScore = row.score;
  });
  const users = await User.find({ _id: { $in: rows.map((row) => row.userId) }, status: 'active' }).select('username displayName avatarUrl').lean();
  const byId = new Map(users.map((user) => [String(user._id), user]));
  const items = rows.flatMap((row) => {
    const user = byId.get(row.userId);
    return user ? [{ rank: rankByUser.get(row.userId) ?? null, score: row.score, passed: row.passed, submittedAt: row.submittedAt, user: { id: row.userId, username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl ?? null } }] : [];
  });
  return { quizTitle: quiz.title, items, participantCount: rows.length };
}
