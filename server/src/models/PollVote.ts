import { model, Schema } from 'mongoose';

const voteSchema = new Schema({
  pollId: { type: Schema.Types.ObjectId, ref: 'Poll', required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  optionIds: { type: [Schema.Types.ObjectId], required: true },
  requestKey: { type: String, default: null, maxlength: 120 },
  changedAt: { type: Date, default: null },
  feeTransactionId: { type: Schema.Types.ObjectId, ref: 'QCoinLedger', default: null },
  rewardPaidAt: { type: Date, default: null },
}, { timestamps: true, versionKey: false });

voteSchema.index({ pollId: 1, userId: 1 }, { unique: true });
voteSchema.index({ userId: 1, createdAt: -1 });
export const PollVote = model('PollVote', voteSchema);
