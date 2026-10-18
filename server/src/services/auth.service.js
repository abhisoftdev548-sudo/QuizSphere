import User from '../models/User.js';
import { generateToken } from '../utils/jwt.js';
import { addQCoinTransaction } from '../utils/qcoin.js';

export const registerUser = async ({ username, email, password, role }) => {
  const existingEmail = await User.findOne({ email });
  if (existingEmail) throw Object.assign(new Error('Email already registered'), { statusCode: 400 });
  
  const existingUsername = await User.findOne({ username });
  if (existingUsername) throw Object.assign(new Error('Username already taken'), { statusCode: 400 });

  // Only allow admin creation if no admin exists yet, or prevent regular users from becoming admin
  const finalRole = role === 'admin' ? 'admin' : 'user';
  // For security, if there is already an admin, don't allow self-register as admin unless explicitly allowed in dev
  if (finalRole === 'admin') {
    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount > 0 && process.env.NODE_ENV === 'production') {
      throw Object.assign(new Error('Admin registration not allowed'), { statusCode: 403 });
    }
  }

  const user = await User.create({ username, email, password, role: finalRole });
  
  // Welcome bonus transaction
  try {
    await addQCoinTransaction({
      userId: user._id,
      type: 'bonus',
      amount: 0, // already given via default, but log it
      description: 'Welcome bonus - 100 QCoins',
      relatedType: 'system'
    });
  } catch {}

  const token = generateToken(user._id);
  return { user: user.toJSON(), token };
};

export const loginUser = async ({ email, password }) => {
  const user = await User.findOne({ email }).select('+password');
  if (!user) throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });

  const isMatch = await user.comparePassword(password);
  if (!isMatch) throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });

  if (!user.isActive) throw Object.assign(new Error('Account deactivated'), { statusCode: 403 });

  user.lastLogin = new Date();
  await user.save();

  const token = generateToken(user._id);
  return { user: user.toJSON(), token };
};

export const getUserProfile = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });
  return user.toJSON();
};
