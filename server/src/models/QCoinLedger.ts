import { model, Schema } from 'mongoose';

const ledgerSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  amount: { type: Number, required: true, validate: { validator: Number.isInteger, message: 'QCoin amounts must be whole numbers' } },
  type: { type: String, required: true, enum: ['signup_bonus', 'creation_fee', 'quiz_entry_fee', 'poll_vote_fee', 'quiz_reward', 'poll_reward', 'prize_payout', 'refund', 'admin_adjustment'] },
  idempotencyKey: { type: String, required: true, unique: true, maxlength: 200 },
  relatedType: { type: String, enum: ['quiz', 'poll', 'attempt', 'vote', 'admin', 'account', null], default: null },
  relatedId: { type: Schema.Types.ObjectId, default: null },
  description: { type: String, required: true, maxlength: 300 },
  referenceId: { type: String, default: null, maxlength: 150 },
}, { timestamps: { createdAt: true, updatedAt: false }, versionKey: false });

ledgerSchema.index({ userId: 1, createdAt: -1 });
export const QCoinLedger = model('QCoinLedger', ledgerSchema);
