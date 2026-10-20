import type { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Poll } from '../models/Poll.js';
import { Quiz } from '../models/Quiz.js';
import { QuizAttempt } from '../models/QuizAttempt.js';
import { User } from '../models/User.js';
import { quizAttemptLeaderboardPipeline } from '../services/leaderboard.service.js';
import { sendData } from '../utils/http.js';

function startOfPeriod(period: string): Date | null {
  const date = new Date();
  if (period === 'all') return null;
  if (period === 'week') {
    date.setUTCHours(0, 0, 0, 0);
    const day = date.getUTCDay();
    date.setUTCDate(date.getUTCDate() - ((day + 6) % 7));
    return date;
  }
  date.setUTCDate(1);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

export async function leaderboard(req: Request, res: Response): Promise<void> {
  const type = ['performance', 'consistency', 'creators'].includes(String(req.query.type)) ? String(req.query.type) : 'performance';
  const period = ['week', 'month', 'all'].includes(String(req.query.period)) ? String(req.query.period) : 'month';
  const start = startOfPeriod(period);
  const dateMatch = start ? { $gte: start } : { $exists: true };
  let ranked: Array<any> = [];
  if (type === 'creators') {
    const [quizRows, pollRows] = await Promise.all([
      Quiz.aggregate([{ $match: { status: 'published', publishedAt: dateMatch } }, { $group: { _id: '$creatorId', published: { $sum: 1 }, engagement: { $sum: '$attemptCount' } } }]),
      Poll.aggregate([{ $match: { status: 'published', publishedAt: dateMatch } }, { $group: { _id: '$creatorId', published: { $sum: 1 }, engagement: { $sum: '$voteCount' } } }]),
    ]);
    const byUser = new Map<string, { published: number; engagement: number }>();
    for (const row of [...quizRows, ...pollRows]) {
      const key = String(row._id);
      const current = byUser.get(key) ?? { published: 0, engagement: 0 };
      current.published += row.published;
      current.engagement += row.engagement;
      byUser.set(key, current);
    }
    ranked = [...byUser.entries()].filter(([, stats]) => stats.published > 0).map(([id, stats]) => ({ id, score: stats.engagement, publishedCount: stats.published, engagement: stats.engagement }));
    ranked.sort((a, b) => b.score - a.score || b.publishedCount - a.publishedCount || a.id.localeCompare(b.id));
  } else {
    const aggregate = await QuizAttempt.aggregate(quizAttemptLeaderboardPipeline(dateMatch));
    ranked = aggregate.map((row) => ({ id: String(row._id), score: type === 'consistency' ? row.passed : Math.round(row.averageScore), attempts: row.attempts, passed: row.passed, bestScore: row.bestScore, averageScore: Math.round(row.averageScore), passRate: Math.round((row.passed / row.attempts) * 100) }));
    ranked.sort((a, b) => type === 'consistency' ? b.passed - a.passed || b.passRate - a.passRate || b.attempts - a.attempts || a.id.localeCompare(b.id) : b.score - a.score || b.attempts - a.attempts || b.bestScore - a.bestScore || a.id.localeCompare(b.id));
  }
  const pageUsers = ranked.slice(0, 100);
  const users = pageUsers.length ? await User.find({ _id: { $in: pageUsers.map((row) => new Types.ObjectId(row.id)) }, status: 'active' }).select('username displayName avatarUrl').lean() : [];
  const usersById = new Map(users.map((user) => [String(user._id), user]));
  const items = pageUsers.flatMap((row, index) => {
    const user = usersById.get(row.id);
    if (!user) return [];
    return [{ rank: index + 1, user: { id: row.id, username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl ?? null }, score: row.score, attempts: row.attempts ?? null, passed: row.passed ?? null, bestScore: row.bestScore ?? null, averageScore: row.averageScore ?? null, passRate: row.passRate ?? null, publishedCount: row.publishedCount ?? null, engagement: row.engagement ?? null }];
  });
  const meIndex = items.findIndex((item) => item.user.id === req.auth?.userId);
  sendData(res, { type, period, items, currentUser: meIndex >= 0 ? { ...items[meIndex], isCurrentUser: true } : null, currentUserRank: meIndex >= 0 ? meIndex + 1 : null });
}
