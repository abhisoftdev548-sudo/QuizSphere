import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import type { Request, Response } from 'express';
import { env } from '../config/env.js';
import { PlatformConfig } from '../models/PlatformConfig.js';
import { Notification } from '../models/Notification.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { PasswordResetToken } from '../models/PasswordResetToken.js';
import { User } from '../models/User.js';
import { issueSession, clearAuthCookies, getRefreshToken, hashToken, verifyRefreshToken } from '../services/auth.service.js';
import { runInTransaction } from '../services/transaction.service.js';
import { applyLedgerEntry } from '../services/wallet.service.js';
import { emailDeliveryConfigured, sendPasswordResetEmail } from '../services/email.service.js';
import { ApiError } from '../utils/ApiError.js';
import { sendData } from '../utils/http.js';

function publicUser(user: any) {
  return {
    id: String(user._id), email: user.email, username: user.username, displayName: user.displayName,
    role: user.role, status: user.status, walletBalance: user.walletBalance,
    avatarUrl: user.avatarUrl ?? null, bio: user.bio ?? '', createdAt: user.createdAt,
  };
}

export async function register(req: Request, res: Response): Promise<void> {
  const { email, username, displayName, password } = req.body as { email: string; username: string; displayName: string; password: string };
  const passwordHash = await bcrypt.hash(password, 12);
  try {
    const createdUser = await runInTransaction(async (session) => {
      const [created] = await User.create([{ email, username, displayName, passwordHash, role: 'user', signupBonusAwardedAt: new Date() }], { session });
      if (!created) throw new ApiError(500, 'Unable to create the account.', 'ACCOUNT_CREATE_FAILED');
      const config = await PlatformConfig.findById('global').session(session);
      const bonus = config?.signupBonus ?? env.SIGNUP_BONUS_QCOINS;
      if (bonus > 0) {
        const bonusEntry = await applyLedgerEntry({
          userId: created._id, amount: bonus, type: 'signup_bonus', idempotencyKey: `signup-bonus:${created._id}`,
          description: 'QuizSphere account signup bonus', relatedType: 'account', relatedId: created._id,
        }, session);
        await Notification.create([{ userId: created._id, type: 'qcoin_earned', title: 'Signup bonus added', message: `${bonus} QCoins were added to your new account.`, relatedType: 'ledger', relatedId: bonusEntry._id }], { session });
      }
      return { id: created._id, bonus };
    });
    const user = await User.findById(createdUser.id);
    if (!user) throw new ApiError(500, 'The account was created but could not be loaded.', 'ACCOUNT_LOAD_FAILED');
    await issueSession(user, req, res);
    sendData(res, { user: publicUser(user), signupBonus: createdUser.bonus }, 201);
  } catch (error) {
    if (isTransactionUnavailable(error)) throw new ApiError(503, 'Account registration requires MongoDB transaction support. Use MongoDB Atlas or a replica set.', 'TRANSACTION_SUPPORT_REQUIRED');
    throw error;
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as { email: string; password: string };
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) throw new ApiError(401, 'Email or password is incorrect.', 'INVALID_CREDENTIALS');
  if (user.status !== 'active') throw new ApiError(403, 'This account is currently unavailable. Contact support if you believe this is a mistake.', 'ACCOUNT_UNAVAILABLE');
  user.lastActiveAt = new Date();
  await user.save();
  await issueSession(user, req, res);
  sendData(res, { user: publicUser(user) });
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const rawToken = getRefreshToken(req);
  if (!rawToken) { clearAuthCookies(res); throw new ApiError(401, 'Your session has expired. Please sign in again.', 'SESSION_EXPIRED'); }
  let claims;
  try { claims = verifyRefreshToken(rawToken); } catch {
    clearAuthCookies(res);
    throw new ApiError(401, 'Your session has expired. Please sign in again.', 'SESSION_EXPIRED');
  }
  const tokenHash = hashToken(rawToken);
  const stored = await RefreshToken.findOne({ tokenHash });
  if (!stored || String(stored.userId) !== claims.sub) {
    clearAuthCookies(res);
    throw new ApiError(401, 'Your session is no longer valid. Please sign in again.', 'SESSION_EXPIRED');
  }
  if (stored.revokedAt) {
    await RefreshToken.updateMany({ familyId: stored.familyId, revokedAt: null }, { $set: { revokedAt: new Date() } });
    clearAuthCookies(res);
    throw new ApiError(401, 'A reused session token was detected. Please sign in again.', 'SESSION_REUSE_DETECTED');
  }
  if (stored.expiresAt.getTime() <= Date.now()) {
    clearAuthCookies(res);
    throw new ApiError(401, 'Your session has expired. Please sign in again.', 'SESSION_EXPIRED');
  }
  const claimed = await RefreshToken.findOneAndUpdate({ _id: stored._id, revokedAt: null }, { $set: { revokedAt: new Date() } }, { new: true });
  if (!claimed) { clearAuthCookies(res); throw new ApiError(401, 'Your session has already been refreshed.', 'SESSION_ROTATED'); }
  const user = await User.findById(claims.sub).select('_id role email username displayName status walletBalance avatarUrl bio createdAt');
  if (!user || user.status !== 'active') {
    clearAuthCookies(res);
    throw new ApiError(401, 'This account is unavailable.', 'ACCOUNT_UNAVAILABLE');
  }
  const replacementId = await issueSession(user, req, res, stored.familyId);
  await RefreshToken.updateOne({ _id: stored._id }, { $set: { replacedBy: replacementId } });
  sendData(res, { user: publicUser(user) });
}

export async function logout(req: Request, res: Response): Promise<void> {
  const rawToken = getRefreshToken(req);
  if (rawToken) await RefreshToken.updateOne({ tokenHash: hashToken(rawToken), revokedAt: null }, { $set: { revokedAt: new Date() } });
  clearAuthCookies(res);
  sendData(res, { loggedOut: true });
}

export async function getMe(req: Request, res: Response): Promise<void> {
  const user = await User.findById(req.auth?.userId);
  if (!user) throw new ApiError(404, 'Account not found.', 'ACCOUNT_NOT_FOUND');
  sendData(res, { user: publicUser(user) });
}

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  const email = String((req.body as { email: string }).email).toLowerCase();
  const user = await User.findOne({ email, status: 'active' }).select('_id email');
  let developmentResetUrl: string | undefined;
  if (user) {
    const rawToken = crypto.randomBytes(32).toString('base64url');
    await PasswordResetToken.updateMany({ userId: user._id, usedAt: null }, { $set: { usedAt: new Date() } });
    await PasswordResetToken.create({ userId: user._id, tokenHash: hashToken(rawToken), expiresAt: new Date(Date.now() + 60 * 60 * 1000) });
    const origin = env.CLIENT_ORIGIN.split(',')[0]?.trim() || 'http://localhost:5173';
    const link = new URL('/reset-password', origin);
    link.searchParams.set('token', rawToken);
    link.searchParams.set('email', email);
    if (emailDeliveryConfigured()) {
      try { await sendPasswordResetEmail(email, link.toString()); }
      catch (error) { console.error('Password reset email delivery failed.', error); if (env.NODE_ENV !== 'production') developmentResetUrl = link.toString(); }
    } else if (env.NODE_ENV !== 'production') developmentResetUrl = link.toString();
  }
  sendData(res, { message: 'If an active account matches that email address, password reset instructions have been sent.', ...(developmentResetUrl ? { developmentResetUrl } : {}) });
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  const { token, password } = req.body as { token: string; password: string };
  const tokenHash = hashToken(token);
  const passwordHash = await bcrypt.hash(password, 12);
  await runInTransaction(async (session) => {
    const resetToken = await PasswordResetToken.findOne({ tokenHash, usedAt: null, expiresAt: { $gt: new Date() } }).session(session);
    if (!resetToken) throw new ApiError(400, 'This password reset link is invalid, expired, or already used.', 'INVALID_RESET_TOKEN');
    const user = await User.findOne({ _id: resetToken.userId, status: 'active' }).session(session);
    if (!user) throw new ApiError(400, 'This password reset link is invalid, expired, or already used.', 'INVALID_RESET_TOKEN');
    user.passwordHash = passwordHash;
    await user.save({ session });
    resetToken.usedAt = new Date();
    await resetToken.save({ session });
    await RefreshToken.updateMany({ userId: user._id, revokedAt: null }, { $set: { revokedAt: new Date() } }, { session });
  });
  clearAuthCookies(res);
  sendData(res, { reset: true, message: 'Password updated. Sign in with your new password.' });
}

function isTransactionUnavailable(error: unknown): boolean {
  const message = error instanceof Error ? error.message : '';
  return /Transaction numbers are only allowed|replica set|mongos|does not support transactions/i.test(message);
}
