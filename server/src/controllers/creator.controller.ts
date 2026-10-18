import type { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Category } from '../models/Category.js';
import { AuditLog } from '../models/AuditLog.js';
import { Notification } from '../models/Notification.js';
import { PlatformConfig } from '../models/PlatformConfig.js';
import { Poll } from '../models/Poll.js';
import { PollVote } from '../models/PollVote.js';
import { Quiz, QuizVersion } from '../models/Quiz.js';
import { QuizAttempt } from '../models/QuizAttempt.js';
import { applyLedgerEntry } from '../services/wallet.service.js';
import { runInTransaction } from '../services/transaction.service.js';
import { ApiError } from '../utils/ApiError.js';
import { sendData, pageNumber } from '../utils/http.js';

function ownerId(req: Request): string { return req.auth!.userId; }
function requestKey(req: Request): string {
  const key = req.get('idempotency-key')?.trim();
  if (!key || key.length > 120) throw new ApiError(400, 'An Idempotency-Key header is required for this action.', 'IDEMPOTENCY_KEY_REQUIRED');
  return key;
}
async function categoryExists(id: string | null | undefined, type: 'quiz' | 'poll'): Promise<void> {
  if (!id) return;
  const category = await Category.findOne({ _id: id, isActive: true, contentType: { $in: [type, 'both'] } });
  if (!category) throw new ApiError(422, 'Choose an available category.', 'INVALID_CATEGORY');
}
async function getConfig() {
  const stored = await PlatformConfig.findById('global').lean();
  return { freeQuizQuestionLimit: stored?.freeQuizQuestionLimit ?? 10, additionalQuestionFee: stored?.additionalQuestionFee ?? 0, maxQuizQuestions: stored?.maxQuizQuestions ?? 50, maxQuizEntryFee: stored?.maxQuizEntryFee ?? 500, maxPollVoteFee: stored?.maxPollVoteFee ?? 100 };
}
function feeConfirmation(req: Request): boolean { return req.get('x-confirm-qcoin-fee') === 'true'; }

export async function createQuiz(req: Request, res: Response): Promise<void> {
  const data = req.body as any;
  const key = requestKey(req);
  const config = await getConfig();
  if (data.questions.length > config.maxQuizQuestions) throw new ApiError(422, `This platform currently allows up to ${config.maxQuizQuestions} questions per quiz.`, 'QUESTION_LIMIT');
  if (data.entryFee > config.maxQuizEntryFee) throw new ApiError(422, `Quiz entry fees may not exceed ${config.maxQuizEntryFee} QCoins.`, 'ENTRY_FEE_LIMIT');
  await categoryExists(data.categoryId, 'quiz');
  const fee = Math.max(0, data.questions.length - config.freeQuizQuestionLimit) * config.additionalQuestionFee;
  if (fee > 0 && !feeConfirmation(req)) throw new ApiError(402, 'Confirm the QCoin creation fee before saving this quiz.', 'FEE_CONFIRMATION_REQUIRED', { fee, freeQuestionLimit: config.freeQuizQuestionLimit, additionalQuestionFee: config.additionalQuestionFee, totalQuestions: data.questions.length });

  const result = await runInTransaction(async (session) => {
    const existing = await Quiz.findOne({ creatorId: ownerId(req), creationKey: key }).session(session);
    if (existing) {
      if (existing.title !== data.title) throw new ApiError(409, 'This Idempotency-Key was already used for another quiz.', 'IDEMPOTENCY_CONFLICT');
      return existing;
    }
    const quiz = new Quiz({ ...data, categoryId: data.categoryId || null, creatorId: ownerId(req), creationKey: key, questionCount: data.questions.length, status: 'draft', version: 1 });
    await quiz.save({ session });
    const [version] = await QuizVersion.create([{ quizId: quiz._id, version: 1, questions: data.questions, createdBy: ownerId(req), note: 'Initial draft' }], { session });
    if (!version) throw new ApiError(500, 'Unable to create a quiz version.', 'QUIZ_VERSION_CREATE_FAILED');
    quiz.currentVersionId = version._id;
    await quiz.save({ session });
    if (fee > 0) {
      const entry = await applyLedgerEntry({ userId: ownerId(req), amount: -fee, type: 'creation_fee', idempotencyKey: `quiz-create:${ownerId(req)}:${key}`, description: `Premium question fee for “${quiz.title}”`, relatedType: 'quiz', relatedId: quiz._id }, session);
      await Notification.create([{ userId: ownerId(req), type: 'qcoin_spent', title: 'Quiz creation fee paid', message: `${fee} QCoins were used to create “${quiz.title}”.`, link: '/creator-studio', relatedType: 'ledger', relatedId: entry._id }], { session });
    }
    return quiz;
  });
  sendData(res, { item: serializeCreatorQuiz(result) }, 201);
}

export async function updateQuiz(req: Request, res: Response): Promise<void> {
  const data = req.body as any;
  const config = await getConfig();
  if (data.questions.length > config.maxQuizQuestions) throw new ApiError(422, `This platform currently allows up to ${config.maxQuizQuestions} questions per quiz.`, 'QUESTION_LIMIT');
  if (data.entryFee > config.maxQuizEntryFee) throw new ApiError(422, `Quiz entry fees may not exceed ${config.maxQuizEntryFee} QCoins.`, 'ENTRY_FEE_LIMIT');
  await categoryExists(data.categoryId, 'quiz');
  const quiz = await Quiz.findOne({ _id: req.params.id, creatorId: ownerId(req) });
  if (!quiz) throw new ApiError(404, 'Quiz not found.', 'CONTENT_NOT_FOUND');
  if (!['draft', 'changes_requested', 'rejected'].includes(quiz.status)) throw new ApiError(409, 'This quiz cannot be edited in its current review or publication state.', 'CONTENT_NOT_EDITABLE');
  const nextVersion = quiz.version + 1;
  await runInTransaction(async (session) => {
    const [version] = await QuizVersion.create([{ quizId: quiz._id, version: nextVersion, questions: data.questions, createdBy: ownerId(req), note: 'Creator revision' }], { session });
    if (!version) throw new ApiError(500, 'Unable to create a quiz revision.', 'QUIZ_VERSION_CREATE_FAILED');
    await Quiz.updateOne({ _id: quiz._id, creatorId: ownerId(req), version: quiz.version }, { $set: { ...data, categoryId: data.categoryId || null, currentVersionId: version._id, questionCount: data.questions.length, version: nextVersion, status: quiz.status === 'rejected' ? 'draft' : quiz.status } }, { session });
  });
  const updated = await Quiz.findById(quiz._id);
  sendData(res, { item: serializeCreatorQuiz(updated) });
}

export async function submitQuiz(req: Request, res: Response): Promise<void> {
  const quiz = await Quiz.findOne({ _id: req.params.id, creatorId: ownerId(req) });
  if (!quiz) throw new ApiError(404, 'Quiz not found.', 'CONTENT_NOT_FOUND');
  if (!['draft', 'changes_requested'].includes(quiz.status)) throw new ApiError(409, 'Only a draft or requested revision can be submitted.', 'INVALID_CONTENT_STATE');
  if (!quiz.currentVersionId || quiz.questionCount < 1) throw new ApiError(422, 'Add at least one valid question before submitting.', 'INCOMPLETE_CONTENT');
  quiz.status = 'pending_review';
  quiz.reviewFeedback = '';
  await quiz.save();
  sendData(res, { item: serializeCreatorQuiz(quiz) });
}

export async function createPoll(req: Request, res: Response): Promise<void> {
  const data = req.body as any;
  const key = requestKey(req);
  const config = await getConfig();
  if (data.votingFee > config.maxPollVoteFee) throw new ApiError(422, `Poll voting fees may not exceed ${config.maxPollVoteFee} QCoins.`, 'VOTING_FEE_LIMIT');
  await categoryExists(data.categoryId, 'poll');
  const result = await runInTransaction(async (session) => {
    const existing = await Poll.findOne({ creatorId: ownerId(req), creationKey: key }).session(session);
    if (existing) {
      if (existing.title !== data.title) throw new ApiError(409, 'This Idempotency-Key was already used for another poll.', 'IDEMPOTENCY_CONFLICT');
      return existing;
    }
    const poll = new Poll({
      title: data.title, description: data.description, categoryId: data.categoryId || null, tags: data.tags,
      options: data.options.map((text: string) => ({ text })), allowMultiple: data.allowMultiple,
      anonymous: data.anonymous, resultVisibility: data.resultVisibility, allowVoteChange: data.allowVoteChange,
      startsAt: data.startsAt ? new Date(data.startsAt) : null, closesAt: data.closesAt ? new Date(data.closesAt) : null,
      votingFee: data.votingFee, creatorId: ownerId(req), creationKey: key, status: 'draft', version: 1,
    });
    await poll.save({ session });
    return poll;
  });
  sendData(res, { item: serializeCreatorPoll(result) }, 201);
}

export async function updatePoll(req: Request, res: Response): Promise<void> {
  const data = req.body as any;
  const config = await getConfig();
  if (data.votingFee > config.maxPollVoteFee) throw new ApiError(422, `Poll voting fees may not exceed ${config.maxPollVoteFee} QCoins.`, 'VOTING_FEE_LIMIT');
  await categoryExists(data.categoryId, 'poll');
  const poll = await Poll.findOne({ _id: req.params.id, creatorId: ownerId(req) });
  if (!poll) throw new ApiError(404, 'Poll not found.', 'CONTENT_NOT_FOUND');
  if (!['draft', 'changes_requested', 'rejected'].includes(poll.status)) throw new ApiError(409, 'This poll cannot be edited in its current review or publication state.', 'CONTENT_NOT_EDITABLE');
  poll.set({
    title: data.title, description: data.description, categoryId: data.categoryId || null, tags: data.tags,
    options: data.options.map((text: string) => ({ text })), allowMultiple: data.allowMultiple, anonymous: data.anonymous,
    resultVisibility: data.resultVisibility, allowVoteChange: data.allowVoteChange,
    startsAt: data.startsAt ? new Date(data.startsAt) : null, closesAt: data.closesAt ? new Date(data.closesAt) : null,
    votingFee: data.votingFee, version: poll.version + 1, status: poll.status === 'rejected' ? 'draft' : poll.status,
  });
  await poll.save();
  sendData(res, { item: serializeCreatorPoll(poll) });
}

export async function submitPoll(req: Request, res: Response): Promise<void> {
  const poll = await Poll.findOne({ _id: req.params.id, creatorId: ownerId(req) });
  if (!poll) throw new ApiError(404, 'Poll not found.', 'CONTENT_NOT_FOUND');
  if (!['draft', 'changes_requested'].includes(poll.status)) throw new ApiError(409, 'Only a draft or requested revision can be submitted.', 'INVALID_CONTENT_STATE');
  if (poll.options.length < 2) throw new ApiError(422, 'A poll needs at least two options.', 'INCOMPLETE_CONTENT');
  poll.status = 'pending_review';
  poll.reviewFeedback = '';
  await poll.save();
  sendData(res, { item: serializeCreatorPoll(poll) });
}

export async function publishApproved(req: Request, res: Response): Promise<void> {
  const type = req.params.type;
  if (type !== 'quiz' && type !== 'poll') throw new ApiError(400, 'Content type must be quiz or poll.', 'INVALID_CONTENT_TYPE');
  const published = await runInTransaction(async (session) => {
    const item: any = type === 'quiz'
      ? await Quiz.findOne({ _id: req.params.id, creatorId: ownerId(req), status: 'approved' }).session(session)
      : await Poll.findOne({ _id: req.params.id, creatorId: ownerId(req), status: 'approved' }).session(session);
    if (!item) throw new ApiError(404, 'Approved content not found.', 'CONTENT_NOT_FOUND');
    item.status = 'published';
    item.publishedAt = new Date();
    await item.save({ session });
    await Notification.create([{ userId: item.creatorId, type: 'content_published', title: 'Your content is published', message: `“${item.title}” is now available to the community.`, link: `/explore/${type === 'quiz' ? 'quizzes' : 'polls'}/${item._id}`, relatedType: type, relatedId: item._id }], { session });
    await AuditLog.create([{ actorId: ownerId(req), action: 'content_published', targetType: type, targetId: String(item._id), reason: 'Creator published approved content.', ipAddress: req.ip ?? '' }], { session });
    return item;
  });
  sendData(res, { item: type === 'quiz' ? serializeCreatorQuiz(published) : serializeCreatorPoll(published) });
}

export async function listCreatorContent(req: Request, res: Response): Promise<void> {
  const [quizzes, polls] = await Promise.all([
    Quiz.find({ creatorId: ownerId(req) }).sort({ updatedAt: -1 }).populate('categoryId', 'name').lean(),
    Poll.find({ creatorId: ownerId(req) }).sort({ updatedAt: -1 }).populate('categoryId', 'name').lean(),
  ]);
  const combined: any[] = [];
  if (req.query.type !== 'poll') combined.push(...quizzes.map((item: any) => serializeCreatorQuiz(item)));
  if (req.query.type !== 'quiz') combined.push(...polls.map((item: any) => serializeCreatorPoll(item)));
  const items = combined.filter((item) => Boolean(item) && (!req.query.status || item.status === req.query.status)).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  sendData(res, { items });
}

export async function creatorAnalytics(req: Request, res: Response): Promise<void> {
  const creatorId = new Types.ObjectId(ownerId(req));
  const [quizStats, pollStats, attemptsByQuiz] = await Promise.all([
    Quiz.aggregate([{ $match: { creatorId } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Poll.aggregate([{ $match: { creatorId } }, { $group: { _id: '$status', count: { $sum: 1 }, votes: { $sum: '$voteCount' } } }]),
    Quiz.aggregate([{ $match: { creatorId, status: 'published' } }, { $lookup: { from: 'quizattempts', localField: '_id', foreignField: 'quizId', as: 'attempts' } }, { $project: { title: 1, count: { $size: '$attempts' } } }, { $sort: { count: -1 } }, { $limit: 8 }]),
  ]);
  const totalAttempts = attemptsByQuiz.reduce((sum, item) => sum + item.count, 0);
  const totalVotes = pollStats.reduce((sum, item) => sum + item.votes, 0);
  const completedAttempts = await QuizAttempt.countDocuments({ quizId: { $in: await Quiz.find({ creatorId, status: 'published' }).distinct('_id') }, status: 'completed' });
  sendData(res, { quizzesByStatus: quizStats, pollsByStatus: pollStats, totalAttempts, completedAttempts, totalVotes, attemptsByQuiz });
}

export async function getQuizDraft(req: Request, res: Response): Promise<void> {
  const quiz = await Quiz.findOne({ _id: req.params.id, creatorId: ownerId(req) }).populate('categoryId', 'name').lean() as any;
  if (!quiz) throw new ApiError(404, 'Quiz not found.', 'CONTENT_NOT_FOUND');
  const version = quiz.currentVersionId ? await QuizVersion.findById(quiz.currentVersionId).lean() as any : null;
  sendData(res, { item: serializeCreatorQuiz(quiz), questions: version?.questions ?? [] });
}

export async function getPollDraft(req: Request, res: Response): Promise<void> {
  const poll = await Poll.findOne({ _id: req.params.id, creatorId: ownerId(req) }).populate('categoryId', 'name').lean() as any;
  if (!poll) throw new ApiError(404, 'Poll not found.', 'CONTENT_NOT_FOUND');
  sendData(res, { item: serializeCreatorPoll(poll) });
}

export async function creatorQuizAnalytics(req: Request, res: Response): Promise<void> {
  const quiz = await Quiz.findOne({ _id: req.params.id, creatorId: ownerId(req) }).lean() as any;
  if (!quiz) throw new ApiError(404, 'Quiz not found.', 'CONTENT_NOT_FOUND');
  const [attempts, distribution] = await Promise.all([
    QuizAttempt.find({ quizId: quiz._id, status: 'completed' }).select('score passed userId submittedAt').lean(),
    QuizAttempt.aggregate([{ $match: { quizId: quiz._id, status: 'completed' } }, { $bucket: { groupBy: '$score', boundaries: [0, 20, 40, 60, 80, 101], default: 'other', output: { count: { $sum: 1 } } } }]),
  ]);
  const unique = new Set(attempts.map((attempt) => String(attempt.userId))).size;
  const passCount = attempts.filter((attempt) => attempt.passed).length;
  const meanScore = attempts.length ? attempts.reduce((sum, attempt) => sum + (attempt.score ?? 0), 0) / attempts.length : null;
  sendData(res, { quizId: String(quiz._id), totalAttempts: await QuizAttempt.countDocuments({ quizId: quiz._id }), completedAttempts: attempts.length, uniqueParticipants: unique, passRate: attempts.length ? Math.round((passCount / attempts.length) * 100) : null, averageScore: meanScore == null ? null : Math.round(meanScore), scoreDistribution: distribution });
}

export async function creatorPollAnalytics(req: Request, res: Response): Promise<void> {
  const poll = await Poll.findOne({ _id: req.params.id, creatorId: ownerId(req) }).lean() as any;
  if (!poll) throw new ApiError(404, 'Poll not found.', 'CONTENT_NOT_FOUND');
  const [votes, distribution] = await Promise.all([
    PollVote.countDocuments({ pollId: poll._id }),
    PollVote.aggregate([{ $match: { pollId: poll._id } }, { $unwind: '$optionIds' }, { $group: { _id: '$optionIds', count: { $sum: 1 } } }]),
  ]);
  sendData(res, { pollId: String(poll._id), totalVotes: votes, distribution: poll.anonymous ? distribution.map((row) => ({ optionId: String(row._id), count: row.count })) : distribution.map((row) => ({ optionId: String(row._id), count: row.count })) });
}

function serializeCreatorQuiz(quiz: any) {
  if (!quiz) return null;
  return { id: String(quiz._id), type: 'quiz', title: quiz.title, description: quiz.description, category: quiz.categoryId?.name ?? null, categoryId: quiz.categoryId?._id ?? quiz.categoryId ?? null, difficulty: quiz.difficulty, tags: quiz.tags, status: quiz.status, questionCount: quiz.questionCount, timeLimitSeconds: quiz.timeLimitSeconds, passingScorePercent: quiz.passingScorePercent, entryFee: quiz.entryFee, prizeRules: quiz.prizeRules, reviewFeedback: quiz.reviewFeedback, version: quiz.version, updatedAt: quiz.updatedAt, createdAt: quiz.createdAt, publishedAt: quiz.publishedAt };
}
function serializeCreatorPoll(poll: any) {
  if (!poll) return null;
  return { id: String(poll._id), type: 'poll', title: poll.title, description: poll.description, category: poll.categoryId?.name ?? null, categoryId: poll.categoryId?._id ?? poll.categoryId ?? null, tags: poll.tags, status: poll.status, options: poll.options?.map((option: any) => ({ id: String(option._id), text: option.text })), allowMultiple: poll.allowMultiple, anonymous: poll.anonymous, resultVisibility: poll.resultVisibility, allowVoteChange: poll.allowVoteChange, startsAt: poll.startsAt, closesAt: poll.closesAt, votingFee: poll.votingFee, reviewFeedback: poll.reviewFeedback, version: poll.version, updatedAt: poll.updatedAt, createdAt: poll.createdAt, publishedAt: poll.publishedAt };
}
