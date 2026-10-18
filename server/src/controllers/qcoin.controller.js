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

export const purchaseQCoins = async (req, res, next) => {
  try {
    const { amount } = req.body;
    if (!amount || amount < 10) return res.status(400).json({ success: false, message: 'Minimum purchase is 10 QCoins' });

    // In real app, integrate payment gateway. Here simulate purchase.
    const { user, transaction } = await addQCoinTransaction({
      userId: req.user._id,
      type: 'purchase',
      amount,
      description: `Purchased ${amount} QCoins`,
      relatedType: 'purchase',
      metadata: { packageId: req.body.packageId || 'custom' }
    });

    res.json({ success: true, message: `Successfully purchased ${amount} QCoins`, data: { user: { qcoins: user.qcoins }, transaction } });
  } catch (err) { next(err); }
};

export const getPackages = async (req, res) => {
  const packages = [
    { id: 'starter', name: 'Starter Pack', qcoins: 100, price: 0.99, bonus: 0, popular: false },
    { id: 'pro', name: 'Pro Pack', qcoins: 500, price: 4.49, bonus: 50, popular: true },
    { id: 'elite', name: 'Elite Pack', qcoins: 1200, price: 9.99, bonus: 200, popular: false },
    { id: 'ultimate', name: 'Ultimate Pack', qcoins: 3000, price: 19.99, bonus: 700, popular: false }
  ];
  res.json({ success: true, data: { packages } });
};
