import QCoinTransaction from '../models/QCoinTransaction.js';
import User from '../models/User.js';

export const addQCoinTransaction = async ({ userId, type, amount, description, relatedId = null, relatedType = 'system', metadata = {} }) => {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  const newBalance = user.qcoins + amount;
  if (newBalance < 0) throw new Error('Insufficient QCoins');

  user.qcoins = newBalance;
  await user.save();

  const transaction = await QCoinTransaction.create({
    user: userId,
    type,
    amount,
    balanceAfter: newBalance,
    description,
    relatedId,
    relatedType,
    metadata
  });

  return { user, transaction };
};

export const calculateQuizReward = (quiz, attempt) => {
  const base = quiz.qcoinReward || 10;
  const percentage = attempt.percentage || 0;
  const difficultyMultiplier = { easy: 1, medium: 1.5, hard: 2 }[quiz.difficulty] || 1;
  // Bonus for high score
  let bonus = 0;
  if (percentage >= 90) bonus = base * 0.5;
  else if (percentage >= 80) bonus = base * 0.3;
  else if (percentage >= 60) bonus = base * 0.1;

  return Math.floor((base + bonus) * difficultyMultiplier);
};
