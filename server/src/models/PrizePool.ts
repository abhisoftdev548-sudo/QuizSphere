import { model, Schema } from 'mongoose';

const quizPrizePoolSchema = new Schema({
  quizId: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true, unique: true },
  fundedAmount: { type: Number, default: 0, min: 0 },
  paidAmount: { type: Number, default: 0, min: 0 },
  collectedEntryFees: { type: Number, default: 0, min: 0 },
  settledAmount: { type: Number, default: 0, min: 0 },
  refundedAmount: { type: Number, default: 0, min: 0 },
  status: { type: String, enum: ['open', 'settled', 'refunded'], default: 'open' },
  settledAt: { type: Date, default: null },
  settlementKey: { type: String, unique: true, sparse: true },
}, { timestamps: true, versionKey: false });

const pollPrizePoolSchema = new Schema({
  pollId: { type: Schema.Types.ObjectId, ref: 'Poll', required: true, unique: true },
  fundedAmount: { type: Number, default: 0, min: 0 },
  collectedVotingFees: { type: Number, default: 0, min: 0 },
  settledAmount: { type: Number, default: 0, min: 0 },
  status: { type: String, enum: ['open', 'settled', 'refunded'], default: 'open' },
  settledAt: { type: Date, default: null },
  settlementKey: { type: String, unique: true, sparse: true },
}, { timestamps: true, versionKey: false });

export const QuizPrizePool = model('QuizPrizePool', quizPrizePoolSchema);
export const PollPrizePool = model('PollPrizePool', pollPrizePoolSchema);
