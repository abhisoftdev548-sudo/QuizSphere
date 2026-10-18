import { Types, type ClientSession } from 'mongoose';
import { QCoinLedger } from '../models/QCoinLedger.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';

export type LedgerInput = {
  userId: string | Types.ObjectId;
  amount: number;
  type: 'signup_bonus' | 'creation_fee' | 'quiz_entry_fee' | 'poll_vote_fee' | 'quiz_reward' | 'poll_reward' | 'prize_payout' | 'refund' | 'admin_adjustment';
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
