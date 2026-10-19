import type { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Category } from '../models/Category.js';
import { Poll } from '../models/Poll.js';
import { PollVote } from '../models/PollVote.js';
import { Quiz, QuizVersion } from '../models/Quiz.js';
import { QuizAttempt } from '../models/QuizAttempt.js';
import { QuizPrizePool } from '../models/PrizePool.js';
import { User } from '../models/User.js';
import { Notification } from '../models/Notification.js';
import { runInTransaction } from '../services/transaction.service.js';
import { scoreAnswers } from '../services/scoring.service.js';
import { ApiError } from '../utils/ApiError.js';
import { sendData, pageNumber } from '../utils/http.js';

const now = () => new Date();
const escaped = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, (match) => `\\${match}`);

export async function getCategories(_req: Request, res: Response): Promise<void> {
  const items = await Category.find({ isActive: true }).sort({ name: 1 }).select('name slug contentType description parentId').lean();
  sendData(res, { items });
}

export async function explore(req: Request, res: Response): Promise<void> {
  const type = ['quiz', 'poll'].includes(String(req.query.type)) ? String(req.query.type) : 'all';
  const page = Math.min(100, pageNumber(req.query.page));
  const limit = Math.min(30, Math.max(1, Number(req.query.limit) || 12));
  const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 100) : '';
  const regex = search ? new RegExp(escaped(search), 'i') : null;
  const categoryId = typeof req.query.categoryId === 'string' && Types.ObjectId.isValid(req.query.categoryId) ? req.query.categoryId : undefined;
  const difficulty = ['beginner', 'intermediate', 'advanced'].includes(String(req.query.difficulty)) ? req.query.difficulty : undefined;
  const sort = ['newest', 'fee_low', 'closing_soon'].includes(String(req.query.sort)) ? String(req.query.sort) : 'newest';
  const time = now();
  const quizQuery: Record<string, unknown> = { status: 'published', $and: [{ $or: [{ closesAt: null }, { closesAt: { $gt: time } }, { closesAt: { $lte: time }, $or: [{ quizType: 'special_event' }, { quizType: null }] }] }] };
  const pollQuery: Record<string, unknown> = { status: 'published', $and: [{ $or: [{ startsAt: null }, { startsAt: { $lte: time } }] }, { $or: [{ closesAt: null }, { closesAt: { $gt: time } }] }] };
  if (regex) {
    quizQuery.$or = [{ title: regex }, { description: regex }, { tags: regex }];
    pollQuery.$or = [{ title: regex }, { description: regex }, { tags: regex }];
  }
  if (categoryId) { quizQuery.categoryId = categoryId; pollQuery.categoryId = categoryId; }
  if (difficulty) quizQuery.difficulty = difficulty;
  const pageSize = type === 'all' ? page * limit : limit;
  const skip = type === 'all' ? 0 : (page - 1) * limit;
  const quizSort: Record<string, 1 | -1> = sort === 'fee_low' ? { entryFee: 1, publishedAt: -1 } : sort === 'closing_soon' ? { closesAt: 1, publishedAt: -1 } : { publishedAt: -1 };
  const pollSort: Record<string, 1 | -1> = sort === 'fee_low' ? { votingFee: 1, publishedAt: -1 } : sort === 'closing_soon' ? { closesAt: 1, publishedAt: -1 } : { publishedAt: -1 };

  const [quizItems, pollItems, quizTotal, pollTotal] = await Promise.all([
    type === 'poll' ? [] : Quiz.find(quizQuery).sort(quizSort).skip(skip).limit(pageSize).populate('creatorId', 'username displayName avatarUrl').populate('categoryId', 'name').lean(),
    type === 'quiz' ? [] : Poll.find(pollQuery).sort(pollSort).skip(skip).limit(pageSize).populate('creatorId', 'username displayName avatarUrl').populate('categoryId', 'name').lean(),
    type === 'poll' ? 0 : Quiz.countDocuments(quizQuery),
    type === 'quiz' ? 0 : Poll.countDocuments(pollQuery),
  ]);
  const quizzes = (quizItems as any[]).map((item) => ({
    id: String(item._id), type: 'quiz', title: item.title, description: item.description, category: item.categoryId?.name ?? null,
    quizType: item.quizType ?? (item.closesAt ? 'special_event' : 'general'), startsAt: item.startsAt ?? null, difficulty: item.difficulty, questionCount: item.questionCount, timeLimitSeconds: item.timeLimitSeconds,
    creator: item.creatorId ? { id: String(item.creatorId._id), username: item.creatorId.username, displayName: item.creatorId.displayName, avatarUrl: item.creatorId.avatarUrl ?? null } : null,
    entryFee: item.entryFee, prizeRules: item.prizeRules, creatorFundedPrize: item.creatorFundedPrize,
    attemptCount: item.attemptCount, publishedAt: item.publishedAt, closesAt: item.closesAt, closed: Boolean(item.closesAt && item.closesAt <= time),
  }));
  const polls = (pollItems as any[]).map((item) => ({
    id: String(item._id), type: 'poll', title: item.title, description: item.description, category: item.categoryId?.name ?? null,
    creator: item.creatorId ? { id: String(item.creatorId._id), username: item.creatorId.username, displayName: item.creatorId.displayName, avatarUrl: item.creatorId.avatarUrl ?? null } : null,
    optionsCount: item.options.length, anonymous: item.anonymous, allowMultiple: item.allowMultiple,
    closesAt: item.closesAt, startsAt: item.startsAt, votingFee: item.votingFee, voteCount: canShowPollSummary(item, false) ? item.voteCount : null,
    publishedAt: item.publishedAt,
  }));
  const combined = [...quizzes, ...polls];
  if (type === 'all') combined.sort((a, b) => {
    if (sort === 'fee_low') return ((a as any).entryFee ?? (a as any).votingFee ?? 0) - ((b as any).entryFee ?? (b as any).votingFee ?? 0) || new Date(b.publishedAt ?? 0).getTime() - new Date(a.publishedAt ?? 0).getTime();
    if (sort === 'closing_soon') return (a.closesAt ? new Date(a.closesAt).getTime() : Number.MAX_SAFE_INTEGER) - (b.closesAt ? new Date(b.closesAt).getTime() : Number.MAX_SAFE_INTEGER);
    return new Date(b.publishedAt ?? 0).getTime() - new Date(a.publishedAt ?? 0).getTime();
  });
  const items = type === 'all' ? combined.slice((page - 1) * limit, page * limit) : combined;
  sendData(res, { items, pagination: { page, limit, total: quizTotal + pollTotal, pages: Math.ceil((quizTotal + pollTotal) / limit) } });
}

export async function quizDetail(req: Request, res: Response): Promise<void> {
  const quiz = await Quiz.findOne({ _id: req.params.id, status: 'published' })
    .populate('creatorId', 'username displayName avatarUrl createdAt').populate('categoryId', 'name').lean() as any;
  const time = now();
  const quizType = quiz?.quizType ?? (quiz?.closesAt ? 'special_event' : 'general');
  if (!quiz || (quiz.closesAt && quiz.closesAt <= time && quizType !== 'special_event')) throw new ApiError(404, 'This quiz is not currently available.', 'CONTENT_NOT_FOUND');
  const pool = await QuizPrizePool.findOne({ quizId: quiz._id }).select('fundedAmount paidAmount status').lean() as any;
  const closed = Boolean(quiz.closesAt && quiz.closesAt <= time);
  sendData(res, {
    id: String(quiz._id), type: 'quiz', title: quiz.title, description: quiz.description, category: quiz.categoryId?.name ?? null,
    quizType, difficulty: quiz.difficulty, tags: quiz.tags, questionCount: quiz.questionCount, timeLimitSeconds: quiz.timeLimitSeconds,
    passingScorePercent: quiz.passingScorePercent, entryFee: quiz.entryFee, requiredPassKey: quiz.requiredPassKey ?? null, prizeRules: quiz.prizeRules,
    creatorFundedPrize: quiz.creatorFundedPrize, rewardPerWinner: quiz.rewardPerWinner ?? 0, rewardPoolRemaining: pool?.status === 'open' ? Math.max(0, pool.fundedAmount - (pool.paidAmount ?? 0)) : 0,
    startsAt: quiz.startsAt ?? null, closesAt: quiz.closesAt, closed, allowResultReview: quiz.allowResultReview,
    creator: quiz.creatorId ? { id: String(quiz.creatorId._id), username: quiz.creatorId.username, displayName: quiz.creatorId.displayName, avatarUrl: quiz.creatorId.avatarUrl ?? null, createdAt: quiz.creatorId.createdAt } : null,
    publishedAt: quiz.publishedAt,
  });
}

export async function quizEventResults(req: Request, res: Response): Promise<void> {
  const quiz = await Quiz.findOne({ _id: req.params.id, status: 'published' }).select('quizType closesAt title passingScorePercent').lean() as any;
  const quizType = quiz?.quizType ?? (quiz?.closesAt ? 'special_event' : 'general');
  if (!quiz || quizType !== 'special_event' || !quiz.closesAt) throw new ApiError(404, 'Special Event results are not available.', 'CONTENT_NOT_FOUND');
  if (quiz.closesAt > now()) throw new ApiError(409, 'Special Event results will be available after the quiz closes.', 'RESULTS_PENDING');
  await runInTransaction(async (session) => {
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
  });
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
  sendData(res, { quizTitle: quiz.title, items, participantCount: rows.length });
}

export async function pollDetail(req: Request, res: Response): Promise<void> {
  const poll = await Poll.findOne({ _id: req.params.id, status: { $in: ['published', 'closed'] } }).populate('creatorId', 'username displayName avatarUrl').populate('categoryId', 'name').lean() as any;
  const time = now();
  if (!poll || (poll.status === 'published' && ((poll.startsAt && poll.startsAt > time) || (poll.closesAt && poll.closesAt <= time)))) throw new ApiError(404, 'This poll is not currently available.', 'CONTENT_NOT_FOUND');
  const vote = req.auth?.userId ? await PollVote.findOne({ pollId: poll._id, userId: req.auth.userId }).select('optionIds').lean() : null;
  const closed = Boolean(poll.closesAt && poll.closesAt <= time) || poll.status === 'closed';
  const visible = poll.resultVisibility === 'public' || closed || (poll.resultVisibility === 'after_vote' && Boolean(vote));
  let results: Array<{ optionId: string; count: number }> | null = null;
  if (visible) {
    const counts = await PollVote.aggregate([
      { $match: { pollId: new Types.ObjectId(String(poll._id)) } }, { $unwind: '$optionIds' },
      { $group: { _id: '$optionIds', count: { $sum: 1 } } },
    ]);
    results = counts.map((row) => ({ optionId: String(row._id), count: row.count }));
  }
  sendData(res, {
    id: String(poll._id), type: 'poll', title: poll.title, description: poll.description, category: poll.categoryId?.name ?? null,
    options: poll.options.map((option: any) => ({ id: String(option._id), text: option.text })), allowMultiple: poll.allowMultiple,
    anonymous: poll.anonymous, resultVisibility: poll.resultVisibility, allowVoteChange: poll.allowVoteChange,
    startsAt: poll.startsAt, closesAt: poll.closesAt, status: poll.status, votingFee: poll.votingFee, reward: poll.reward,
    voteCount: visible ? poll.voteCount : null, results,
    myVote: vote ? vote.optionIds.map((id: unknown) => String(id)) : null,
    creator: poll.creatorId ? { id: String(poll.creatorId._id), username: poll.creatorId.username, displayName: poll.creatorId.displayName, avatarUrl: poll.creatorId.avatarUrl ?? null } : null,
  });
}

export async function quizPrivatePreview(req: Request, res: Response): Promise<void> {
  const quiz = await Quiz.findOne({ _id: req.params.id, creatorId: req.auth!.userId }).lean() as any;
  if (!quiz?.currentVersionId) throw new ApiError(404, 'Quiz draft not found.', 'CONTENT_NOT_FOUND');
  const version = await QuizVersion.findById(quiz.currentVersionId).lean() as any;
  if (!version) throw new ApiError(404, 'Quiz version not found.', 'CONTENT_NOT_FOUND');
  sendData(res, { quiz: { id: String(quiz._id), title: quiz.title }, questions: version.questions });
}

function canShowPollSummary(poll: any, hasVoted: boolean): boolean {
  return poll.resultVisibility === 'public' || poll.status === 'closed' || (poll.resultVisibility === 'after_vote' && hasVoted);
}
