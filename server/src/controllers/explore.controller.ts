import type { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Category } from '../models/Category.js';
import { Poll } from '../models/Poll.js';
import { PollVote } from '../models/PollVote.js';
import { Quiz, QuizVersion } from '../models/Quiz.js';
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
  const quizQuery: Record<string, unknown> = { status: 'published', $and: [{ $or: [{ closesAt: null }, { closesAt: { $gt: time } }] }] };
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
    difficulty: item.difficulty, questionCount: item.questionCount, timeLimitSeconds: item.timeLimitSeconds,
    creator: item.creatorId ? { id: String(item.creatorId._id), username: item.creatorId.username, displayName: item.creatorId.displayName, avatarUrl: item.creatorId.avatarUrl ?? null } : null,
    entryFee: item.entryFee, prizeRules: item.prizeRules, creatorFundedPrize: item.creatorFundedPrize,
    attemptCount: item.attemptCount, publishedAt: item.publishedAt, closesAt: item.closesAt,
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
  if (!quiz || (quiz.closesAt && quiz.closesAt <= now())) throw new ApiError(404, 'This quiz is not currently available.', 'CONTENT_NOT_FOUND');
  sendData(res, {
    id: String(quiz._id), type: 'quiz', title: quiz.title, description: quiz.description, category: quiz.categoryId?.name ?? null,
    difficulty: quiz.difficulty, tags: quiz.tags, questionCount: quiz.questionCount, timeLimitSeconds: quiz.timeLimitSeconds,
    passingScorePercent: quiz.passingScorePercent, entryFee: quiz.entryFee, prizeRules: quiz.prizeRules,
    creatorFundedPrize: quiz.creatorFundedPrize, closesAt: quiz.closesAt, allowResultReview: quiz.allowResultReview,
    creator: quiz.creatorId ? { id: String(quiz.creatorId._id), username: quiz.creatorId.username, displayName: quiz.creatorId.displayName, avatarUrl: quiz.creatorId.avatarUrl ?? null, createdAt: quiz.creatorId.createdAt } : null,
    publishedAt: quiz.publishedAt,
  });
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
