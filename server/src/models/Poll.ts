import { model, Schema } from 'mongoose';

const optionSchema = new Schema({ text: { type: String, required: true, trim: true, maxlength: 160 } });
const rewardSchema = new Schema({
  policy: { type: String, enum: ['none', 'participation', 'creator_funded'], default: 'none' },
  amountPerVoter: { type: Number, default: 0, min: 0 },
  fundedAmount: { type: Number, default: 0, min: 0 },
}, { _id: false });

const pollSchema = new Schema({
  title: { type: String, required: true, trim: true, maxlength: 160 },
  description: { type: String, default: '', trim: true, maxlength: 2000 },
  creatorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  creationKey: { type: String, default: null },
  categoryId: { type: Schema.Types.ObjectId, ref: 'Category', default: null, index: true },
  tags: [{ type: String, trim: true, maxlength: 30 }],
  coverImageUrl: { type: String, default: null, maxlength: 2048 },
  options: { type: [optionSchema], validate: [(value: unknown[]) => value.length >= 2 && value.length <= 10, 'Polls need between 2 and 10 options'] },
  allowMultiple: { type: Boolean, default: false },
  anonymous: { type: Boolean, default: true },
  resultVisibility: { type: String, enum: ['after_vote', 'after_close', 'public'], default: 'after_vote' },
  allowVoteChange: { type: Boolean, default: false },
  startsAt: { type: Date, default: null },
  closesAt: { type: Date, default: null },
  votingFee: { type: Number, default: 0, min: 0 },
  reward: { type: rewardSchema, default: () => ({}) },
  status: { type: String, enum: ['draft', 'pending_review', 'changes_requested', 'approved', 'published', 'rejected', 'closed', 'archived'], default: 'draft', index: true },
  version: { type: Number, default: 1, min: 1 },
  reviewFeedback: { type: String, default: '', maxlength: 1000 },
  voteCount: { type: Number, default: 0, min: 0 },
  publishedAt: { type: Date, default: null },
}, { timestamps: true, versionKey: false });

pollSchema.index({ status: 1, publishedAt: -1 });
pollSchema.index({ title: 'text', description: 'text', tags: 'text' });
pollSchema.index({ creatorId: 1, creationKey: 1 }, { unique: true, sparse: true });
export const Poll = model('Poll', pollSchema);
