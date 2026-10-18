import QCoinTransaction from '../models/QCoinTransaction.js';
import User from '../models/User.js';
import { addQCoinTransaction } from '../utils/qcoin.js';

export const getWallet = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('qcoins points username');
    const transactions = await QCoinTransaction.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50).lean();
    const stats = await QCoinTransaction.aggregate([
      { $match: { user: user._id } },
      { $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);
    res.json({ success: true, data: { user, transactions, stats } });
  } catch (err) { next(err); }
};

export const getTransactions = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const filter = { user: req.user._id };
    if (req.query.type && req.query.type !== 'all') filter.type = req.query.type;

    const [transactions, total] = await Promise.all([
      QCoinTransaction.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      QCoinTransaction.countDocuments(filter)
    ]);

    res.json({ success: true, data: { transactions, total, page, totalPages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
};

export const getEarnInfo = async (req, res) => {
  const earnMethods = [
    { id: 'quiz_complete', title: 'Complete Quizzes', description: 'Earn 10-30 QCoins per quiz based on difficulty and score', qcoins: '10-30', icon: 'trophy' },
    { id: 'high_score', title: 'High Score Bonus', description: 'Score 90%+ to get 50% extra QCoins', qcoins: '+50%', icon: 'star' },
    { id: 'daily_streak', title: 'Daily Streak', description: 'Complete 1 quiz daily for 7 days', qcoins: '50 bonus', icon: 'flame' },
    { id: 'create_quiz', title: 'Create Popular Quiz', description: 'Get 100 QCoins when your quiz reaches 50 attempts', qcoins: '100', icon: 'book' },
    { id: 'poll_vote', title: 'Vote on Polls', description: 'Earn 2 QCoins per poll vote', qcoins: '2', icon: 'vote' },
  ];
  res.json({ success: true, data: { earnMethods } });
};
