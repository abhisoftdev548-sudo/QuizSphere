import type { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Quiz } from '../models/Quiz.js';
import { QuizAttempt } from '../models/QuizAttempt.js';
import { Poll } from '../models/Poll.js';
import { Notification } from '../models/Notification.js';
import { QCoinLedger } from '../models/QCoinLedger.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { sendData, pageNumber } from '../utils/http.js';

export async function getOverview(req: Request, res: Response): Promise<void> {
  const userId = req.auth!.userId;
  const [user, attempts, completed, publishedQuizzes, publishedPolls, pending, latestAttempts, latestNotifications] = await Promise.all([
    User.findById(userId).select('walletBalance displayName'),
    QuizAttempt.countDocuments({ userId }),
    QuizAttempt.countDocuments({ userId, status: 'completed' }),
    Quiz.countDocuments({ creatorId: userId, status: 'published' }),
    Poll.countDocuments({ creatorId: userId, status: 'published' }),
    Quiz.countDocuments({ creatorId: userId, status: { $in: ['pending_review', 'changes_requested'] } }).then((q) => Poll.countDocuments({ creatorId: userId, status: { $in: ['pending_review', 'changes_requested'] } }).then((p) => q + p)),
    QuizAttempt.find({ userId }).sort({ createdAt: -1 }).limit(4).populate('quizId', 'title').lean(),
    Notification.find({ userId }).sort({ createdAt: -1 }).limit(4).lean(),
  ]);
  if (!user) throw new ApiError(404, 'Account not found.', 'ACCOUNT_NOT_FOUND');
  const averageScore = await QuizAttempt.aggregate([
    { $match: { userId: user._id, status: 'completed', score: { $ne: null } } },
    { $group: { _id: null, value: { $avg: '$score' } } },
  ]);
  const activity = [
    ...latestAttempts.map((item: any) => ({ id: String(item._id), type: 'attempt', title: item.quizId?.title ?? 'Quiz attempt', description: item.status === 'completed' ? `Scored ${Math.round(item.score ?? 0)}%` : 'Attempt in progress', createdAt: item.createdAt })),
    ...latestNotifications.map((item: any) => ({ id: String(item._id), type: 'notification', title: item.title, description: item.message, createdAt: item.createdAt })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 6);

  sendData(res, {
    metrics: {
      qcoinBalance: user.walletBalance,
      attempts,
      completedAttempts: completed,
      averageScore: averageScore[0]?.value == null ? null : Math.round(averageScore[0].value),
      publishedCreations: publishedQuizzes + publishedPolls,
      pendingSubmissions: pending,
      leaderboardRank: null,
    },
    recentActivity: activity,
  });
}

export async function getAttempts(req: Request, res: Response): Promise<void> {
  const page = pageNumber(req.query.page);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  const query = { userId: req.auth!.userId };
  const [items, total] = await Promise.all([
    QuizAttempt.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate('quizId', 'title status').lean(),
    QuizAttempt.countDocuments(query),
  ]);
  sendData(res, { items: items.map((item: any) => ({
    id: String(item._id), quizId: String(item.quizId?._id ?? item.quizId), quizTitle: item.quizId?.title ?? 'Unavailable quiz',
    status: item.status, score: item.score, passed: item.passed, correctCount: item.correctCount,
    maxScore: item.maxScore, entryFee: item.entryFee, rewardAmount: item.rewardAmount,
    startedAt: item.startedAt, submittedAt: item.submittedAt,
  })), pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
}

export async function getNotifications(req: Request, res: Response): Promise<void> {
  const page = pageNumber(req.query.page);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  const userId = req.auth!.userId;
  const [items, total, unreadCount] = await Promise.all([
    Notification.find({ userId }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Notification.countDocuments({ userId }), Notification.countDocuments({ userId, readAt: null }),
  ]);
  sendData(res, { items, unreadCount, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
}

export async function markNotificationRead(req: Request, res: Response): Promise<void> {
  const filter: Record<string, unknown> = { userId: req.auth!.userId };
  if (req.params.id !== 'all') filter._id = req.params.id;
  await Notification.updateMany(filter, { $set: { readAt: new Date() } });
  sendData(res, { updated: true });
}

export async function getWallet(req: Request, res: Response): Promise<void> {
  const userId = req.auth!.userId;
  const [user, summaries, signupBonus] = await Promise.all([
    User.findById(userId).select('walletBalance'),
    QCoinLedger.aggregate([
      { $match: { userId: new Types.ObjectId(userId) } },
      { $group: { _id: null, earned: { $sum: { $cond: [{ $gt: ['$amount', 0] }, '$amount', 0] } }, spent: { $sum: { $cond: [{ $lt: ['$amount', 0] }, { $abs: '$amount' }, 0] } } } },
    ]),
    QCoinLedger.findOne({ userId, type: 'signup_bonus' }).select('amount'),
  ]);
  if (!user) throw new ApiError(404, 'Account not found.', 'ACCOUNT_NOT_FOUND');
  sendData(res, { balance: user.walletBalance, totalEarned: summaries[0]?.earned ?? 0, totalSpent: summaries[0]?.spent ?? 0, signupBonus: signupBonus?.amount ?? 0 });
}

export async function getWalletTransactions(req: Request, res: Response): Promise<void> {
  const page = pageNumber(req.query.page);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const [items, total] = await Promise.all([
    QCoinLedger.find({ userId: req.auth!.userId }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    QCoinLedger.countDocuments({ userId: req.auth!.userId }),
  ]);
  sendData(res, { items: items.map((item) => ({ id: String(item._id), date: item.createdAt, type: item.type, amount: item.amount, relatedType: item.relatedType, relatedId: item.relatedId ? String(item.relatedId) : null, description: item.description, status: 'completed' })), pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
}

export async function updateProfile(req: Request, res: Response): Promise<void> {
  const { displayName, bio } = req.body as { displayName?: string; bio?: string };
  const user = await User.findByIdAndUpdate(req.auth!.userId, { $set: { ...(displayName !== undefined ? { displayName } : {}), ...(bio !== undefined ? { bio } : {}) } }, { new: true });
  if (!user) throw new ApiError(404, 'Account not found.', 'ACCOUNT_NOT_FOUND');
  sendData(res, { user: { id: String(user._id), email: user.email, username: user.username, displayName: user.displayName, role: user.role, walletBalance: user.walletBalance, avatarUrl: user.avatarUrl, bio: user.bio, createdAt: user.createdAt } });
}
