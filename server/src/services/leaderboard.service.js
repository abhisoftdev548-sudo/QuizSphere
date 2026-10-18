import User from '../models/User.js';
import Attempt from '../models/Attempt.js';
import mongoose from 'mongoose';

export const getLeaderboard = async ({ range = 'all-time', page = 1, limit = 20, currentUserId = null }) => {
  let dateFilter = null;
  const now = new Date();
  if (range === 'weekly') {
    dateFilter = new Date(now.getTime() - 7*24*60*60*1000);
  } else if (range === 'monthly') {
    dateFilter = new Date(now.getTime() - 30*24*60*60*1000);
  }

  let users;
  let total;

  if (dateFilter) {
    // Aggregate based on attempts in time range
    const aggregation = await Attempt.aggregate([
      { $match: { completedAt: { $gte: dateFilter } } },
      { $group: { _id: '$user', points: { $sum: '$score' }, attempts: { $sum: 1 }, avgScore: { $avg: '$percentage' } } },
      { $sort: { points: -1 } },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $match: { 'user.isActive': true } },
      {
        $project: {
          _id: '$user._id',
          username: '$user.username',
          avatar: '$user.avatar',
          points: 1,
          attempts: 1,
          avgScore: { $round: ['$avgScore', 1] },
          quizzesCompleted: '$user.quizzesCompleted',
          level: '$user.level'
        }
      }
    ]);

    // Paginate aggregation result manually
    total = aggregation.length;
    const skip = (page - 1) * limit;
    users = aggregation.slice(skip, skip + limit).map((u, idx) => ({ ...u, rank: skip + idx + 1 }));

    // Get current user rank if needed
    let currentUserRank = null;
    if (currentUserId) {
      const currentIdx = aggregation.findIndex(u => u._id.toString() === currentUserId.toString());
      if (currentIdx !== -1) {
        currentUserRank = { ...aggregation[currentIdx], rank: currentIdx + 1 };
      } else {
        const cu = await User.findById(currentUserId).lean();
        if (cu) currentUserRank = { _id: cu._id, username: cu.username, avatar: cu.avatar, points: 0, attempts: 0, avgScore: 0, rank: total + 1 };
      }
    }

    return { users, total, page, totalPages: Math.ceil(total / limit), currentUserRank };
  } else {
    // All-time based on user.points
    const skip = (page - 1) * limit;
    const [allUsers, count] = await Promise.all([
      User.find({ isActive: true }).sort({ points: -1 }).skip(skip).limit(limit).select('username avatar points quizzesCompleted level').lean(),
      User.countDocuments({ isActive: true })
    ]);

    users = allUsers.map((u, idx) => ({ ...u, rank: skip + idx + 1, attempts: u.quizzesCompleted, avgScore: 0 }));
    total = count;

    let currentUserRank = null;
    if (currentUserId) {
      const higherCount = await User.countDocuments({ isActive: true, points: { $gt: (await User.findById(currentUserId).select('points').lean())?.points || 0 } });
      const cu = await User.findById(currentUserId).select('username avatar points quizzesCompleted level').lean();
      if (cu) currentUserRank = { ...cu, rank: higherCount + 1, attempts: cu.quizzesCompleted, avgScore: 0 };
    }

    return { users, total, page, totalPages: Math.ceil(total / limit), currentUserRank };
  }
};

export const getUserStats = async (userId) => {
  const user = await User.findById(userId).lean();
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });

  const [attempts, recentAttempts] = await Promise.all([
    Attempt.find({ user: userId }).sort({ completedAt: -1 }).populate('quiz', 'title category').lean(),
    Attempt.find({ user: userId }).sort({ completedAt: -1 }).limit(5).populate('quiz', 'title category thumbnail').lean()
  ]);

  const totalScore = attempts.reduce((sum, a) => sum + a.score, 0);
  const avgPercentage = attempts.length ? Math.round(attempts.reduce((sum, a) => sum + a.percentage, 0) / attempts.length) : 0;
  const passedCount = attempts.filter(a => a.passed).length;

  return {
    user,
    stats: {
      totalAttempts: attempts.length,
      totalScore,
      avgPercentage,
      passedCount,
      failedCount: attempts.length - passedCount
    },
    recentAttempts
  };
};
