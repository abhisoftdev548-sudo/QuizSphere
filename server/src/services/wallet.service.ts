import { Types, type ClientSession } from 'mongoose';
import { QCoinLedger } from '../models/QCoinLedger.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { UserPass } from '../models/UserPass.js';

export type LedgerInput = {
  userId: string | Types.ObjectId;
  amount: number;
  type: 'signup_bonus' | 'creation_fee' | 'quiz_entry_fee' | 'poll_vote_fee' | 'quiz_reward' | 'poll_reward' | 'prize_payout' | 'prize_funding' | 'pass_purchase' | 'pass_sale' | 'pass_marketplace_purchase' | 'refund' | 'admin_adjustment';
  idempotencyKey: string;
  description: string;
  relatedType?: 'quiz' | 'poll' | 'attempt' | 'vote' | 'admin' | 'account' | null;
  relatedId?: string | Types.ObjectId | null;
  referenceId?: string | null;
};

export async function applyLedgerEntry(input: LedgerInput, session: ClientSession) {
  if (!Number.isInteger(input.amount) || input.amount === 0) throw new ApiError(400, 'QCoin amounts must be non-zero whole numbers.', 'INVALID_AMOUNT');
  const existing = await QCoinLedger.findOne({ idempotencyKey: input.idempotencyKey }).session(session);
  if (existing) {
    const sameOperation = String(existing.userId) === String(input.userId) && existing.amount === input.amount && existing.type === input.type;
    if (!sameOperation) throw new ApiError(409, 'This idempotency key was already used for another wallet operation.', 'IDEMPOTENCY_CONFLICT');
    return existing;
  }

  const delta = input.amount;
  const filter = delta < 0 ? { _id: input.userId, status: 'active', walletBalance: { $gte: Math.abs(delta) } } : { _id: input.userId, status: 'active' };
  const user = await User.findOneAndUpdate(filter, { $inc: { walletBalance: delta } }, { new: true, session, projection: { walletBalance: 1 } });
  if (!user) {
    const exists = await User.exists({ _id: input.userId }).session(session);
    if (!exists) throw new ApiError(404, 'Account not found.', 'ACCOUNT_NOT_FOUND');
    throw new ApiError(409, 'You do not have enough QCoins for this action.', 'INSUFFICIENT_QCOINS');
  }

  const [ledger] = await QCoinLedger.create([{
    userId: input.userId,
    amount: delta,
    type: input.type,
    idempotencyKey: input.idempotencyKey,
    description: input.description,
    relatedType: input.relatedType ?? null,
    relatedId: input.relatedId ?? null,
    referenceId: input.referenceId ?? null,
  }], { session });
  if (!ledger) throw new ApiError(500, 'Unable to write the QCoin ledger entry.', 'LEDGER_WRITE_FAILED');
  return ledger;
}

export async function consumePass(userId: string | Types.ObjectId, passKey: string, session: ClientSession) {
  const inventory = await UserPass.findOneAndUpdate(
    { userId, passKey, balance: { $gte: 1 } },
    { $inc: { balance: -1 } },
    { new: true, session },
  );
  if (!inventory) {
    throw new ApiError(402, `You need one ${passKey === 'create' ? 'Create' : passKey.toUpperCase()} Pass for this action.`, 'PASS_REQUIRED', { passKey });
  }
  return inventory;
}

export async function grantPass(userId: string | Types.ObjectId, passKey: string, session: ClientSession) {
  return UserPass.findOneAndUpdate(
    { userId, passKey },
    { $inc: { balance: 1 }, $setOnInsert: { userId, passKey } },
    { upsert: true, new: true, session, setDefaultsOnInsert: true },
  );
}
