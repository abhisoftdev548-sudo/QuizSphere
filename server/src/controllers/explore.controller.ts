import type { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Category } from '../models/Category.js';
import { Poll } from '../models/Poll.js';
import { PollVote } from '../models/PollVote.js';
import { Quiz, QuizVersion } from '../models/Quiz.js';
import { QuizAttempt } from '../models/QuizAttempt.js';
import { QuizPrizePool } from '../models/PrizePool.js';
import { CREATOR_RATING_PROMOTION_MINIMUM, qualifiesCreatorRating } from '../services/creatorRating.service.js';
import { getSpecialEventResults } from '../services/specialEventSettlement.service.js';
import { ApiError } from '../utils/ApiError.js';
import { sendData, pageNumber } from '../utils/http.js';

const now = () => new Date();
const escaped = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, (match) => `\\${match}`);

export async function getCategories(_req: Request, res: Response): Promise<void> {
  const items = await Category.find({ isActive: true }).sort({ name: 1 }).select('name slug contentType description parentId').lean();
  sendData(res, { items });
}

export async function featuredSpecialEvent(_req: Request, res: Response): Promise<void> {
  const time = now();
  const publishedEvents = {
    status: 'published',
    $or: [{ quizType: 'special_event' }, { quizType: null, closesAt: { $ne: null } }],
    closesAt: { $gt: time },
  };
  const activeEvent = await Quiz.findOne({ ...publishedEvents, startsAt: { $lte: time } })
    .sort({ closesAt: 1 }).select('title startsAt closesAt').lean() as any;
  const event = activeEvent ?? await Quiz.findOne({ ...publishedEvents, startsAt: { $gt: time } })
    .sort({ startsAt: 1 }).select('title startsAt closesAt').lean() as any;
  sendData(res, {
    item: event ? { id: String(event._id), title: event.title, startsAt: event.startsAt, closesAt: event.closesAt } : null,
  });
}

export async function explore(req: Request, res: Response): Promise<void> {
  const type = ['quiz', 'poll'].includes(String(req.query.type)) ? String(req.query.type) : 'all';
  const page = Math.min(100, pageNumber(req.query.page));
  const limit = Math.min(30, Math.max(1, Number(req.query.limit) || 12));
  const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 100) : '';
  const regex = search ? new RegExp(escaped(search), 'i') : null;
  const categoryId = typeof req.query.categoryId === 'string' && Types.ObjectId.isValid(req.query.categoryId) ? req.query.categoryId : undefined;
  const difficulty = ['beginner', 'intermediate', 'advanced'].includes(String(req.query.difficulty)) ? req.query.difficulty : undefined;
  const sort = ['newest', 'fee_low', 'closing_soon', 'top_rated'].includes(String(req.query.sort)) ? String(req.query.sort) : 'newest';
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
    type === 'poll' ? [] : sort === 'top_rated'
      ? findTopRatedQuizzes(quizQuery, skip, pageSize)
      : Quiz.find(quizQuery).sort(quizSort).skip(skip).limit(pageSize).populate('creatorId', 'username displayName avatarUrl').populate('categoryId', 'name').lean(),
    type === 'quiz' ? [] : Poll.find(pollQuery).sort(pollSort).skip(skip).limit(pageSize).populate('creatorId', 'username displayName avatarUrl').populate('categoryId', 'name').lean(),
    type === 'poll' ? 0 : Quiz.countDocuments(quizQuery),
    type === 'quiz' ? 0 : Poll.countDocuments(pollQuery),
  ]);
  const quizzes = (quizItems as any[]).map((item) => ({
    id: String(item._id), type: 'quiz', title: item.title, description: item.description, category: item.categoryId?.name ?? null,
    quizType: item.quizType ?? (item.closesAt ? 'special_event' : 'general'), startsAt: item.startsAt ?? null, difficulty: item.difficulty, questionCount: item.questionCount, timeLimitSeconds: item.timeLimitSeconds,
    creator: item.creatorId ? { id: String(item.creatorId._id), username: item.creatorId.username, displayName: item.creatorId.displayName, avatarUrl: item.creatorId.avatarUrl ?? null } : null,
    creatorRatingAverage: item.creatorRatingAverage ?? null, creatorRatingCount: item.creatorRatingCount ?? null, creatorRatingQualified: item.creatorRatingQualified ?? false,
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
    if (sort === 'top_rated') {
      const aCount = (a as any).creatorRatingCount ?? 0;
      const bCount = (b as any).creatorRatingCount ?? 0;
      const aQualified = qualifiesCreatorRating(aCount);
      const bQualified = qualifiesCreatorRating(bCount);
      return Number(bQualified) - Number(aQualified) || (bQualified ? ((b as any).creatorRatingAverage ?? 0) - ((a as any).creatorRatingAverage ?? 0) || bCount - aCount : 0) || new Date(b.publishedAt ?? 0).getTime() - new Date(a.publishedAt ?? 0).getTime();
    }
    if (sort === 'fee_low') return ((a as any).entryFee ?? (a as any).votingFee ?? 0) - ((b as any).entryFee ?? (b as any).votingFee ?? 0) || new Date(b.publishedAt ?? 0).getTime() - new Date(a.publishedAt ?? 0).getTime();
    if (sort === 'closing_soon') return (a.closesAt ? new Date(a.closesAt).getTime() : Number.MAX_SAFE_INTEGER) - (b.closesAt ? new Date(b.closesAt).getTime() : Number.MAX_SAFE_INTEGER);
    return new Date(b.publishedAt ?? 0).getTime() - new Date(a.publishedAt ?? 0).getTime();
  });
  const items = type === 'all' ? combined.slice((page - 1) * limit, page * limit) : combined;
  sendData(res, { items, pagination: { page, limit, total: quizTotal + pollTotal, pages: Math.ceil((quizTotal + pollTotal) / limit) } });
}

async function findTopRatedQuizzes(query: Record<string, unknown>, skip: number, limit: number) {
  const candidates = await Quiz.aggregate([
    { $match: query },
    { $lookup: {
      from: 'creatorratings',
      let: { creatorId: '$creatorId' },
      pipeline: [
        { $match: { $expr: { $eq: ['$creatorId', '$$creatorId'] } } },
        { $group: { _id: null, averageRating: { $avg: '$rating' }, ratingCount: { $sum: 1 } } },
      ],
      as: 'creatorRatingStats',
    } },
    { $addFields: {
      creatorRatingAverage: { $ifNull: [{ $arrayElemAt: ['$creatorRatingStats.averageRating', 0] }, 0] },
      creatorRatingCount: { $ifNull: [{ $arrayElemAt: ['$creatorRatingStats.ratingCount', 0] }, 0] },
    } },
    { $addFields: { ratingQualified: { $gte: ['$creatorRatingCount', CREATOR_RATING_PROMOTION_MINIMUM] } } },
    { $addFields: {
      ratingSortAverage: { $cond: ['$ratingQualified', '$creatorRatingAverage', 0] },
      ratingSortCount: { $cond: ['$ratingQualified', '$creatorRatingCount', 0] },
    } },
    { $sort: { ratingQualified: -1, ratingSortAverage: -1, ratingSortCount: -1, publishedAt: -1 } },
    { $skip: skip },
    { $limit: limit },
    { $project: { _id: 1, creatorRatingAverage: 1, creatorRatingCount: 1, ratingQualified: 1 } },
  ]).exec();
  if (!candidates.length) return [];
  const items = await Quiz.find({ _id: { $in: candidates.map((item) => item._id) } })
    .populate('creatorId', 'username displayName avatarUrl').populate('categoryId', 'name').lean() as any[];
  const itemsById = new Map(items.map((item) => [String(item._id), item]));
  return candidates.flatMap((candidate) => {
    const item = itemsById.get(String(candidate._id));
    return item ? [{ ...item, creatorRatingAverage: Math.round(candidate.creatorRatingAverage * 10) / 10, creatorRatingCount: candidate.creatorRatingCount, creatorRatingQualified: candidate.ratingQualified }] : [];
  });
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
  sendData(res, await getSpecialEventResults(String(req.params.id)));
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
