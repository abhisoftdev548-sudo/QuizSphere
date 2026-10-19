import { model, Schema } from 'mongoose';

const prizeRuleSchema = new Schema({
  rank: { type: Number, required: true, min: 1 },
  sharePercent: { type: Number, required: true, min: 0, max: 100 },
}, { _id: false });

const quizSchema = new Schema({
  title: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, required: true, trim: true, maxlength: 2000 },
  creatorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  creationKey: { type: String, default: null },
  categoryId: { type: Schema.Types.ObjectId, ref: 'Category', default: null, index: true },
  tags: [{ type: String, trim: true, maxlength: 30 }],
  difficulty: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' },
  language: { type: String, default: 'en', maxlength: 12 },
  coverImageUrl: { type: String, default: null, maxlength: 2048 },
  status: { type: String, enum: ['draft', 'pending_review', 'changes_requested', 'approved', 'published', 'rejected', 'closed', 'archived'], default: 'draft', index: true },
  currentVersionId: { type: Schema.Types.ObjectId, ref: 'QuizVersion', default: null },
  version: { type: Number, default: 1, min: 1 },
  questionCount: { type: Number, default: 0, min: 0 },
  quizType: { type: String, enum: ['general', 'special_event', null], default: null, index: true },
  timeLimitSeconds: { type: Number, default: null, min: 30, max: 7200 },
  startsAt: { type: Date, default: null },
  closesAt: { type: Date, default: null },
  passingScorePercent: { type: Number, default: 60, min: 0, max: 100 },
  entryFee: { type: Number, default: 0, min: 0 },
  requiredPassKey: { type: String, enum: ['vip', 'pro', 'legend', 'premium', null], default: null },
  createPassConsumed: { type: Boolean, default: false },
  prizeRules: { type: [prizeRuleSchema], default: [] },
  creatorFundedPrize: { type: Number, default: 0, min: 0 },
  rewardPerWinner: { type: Number, default: 0, min: 0 },
  allowResultReview: { type: Boolean, default: true },
  reviewFeedback: { type: String, default: '', maxlength: 1000 },
  publishedAt: { type: Date, default: null },
  attemptCount: { type: Number, default: 0, min: 0 },
}, { timestamps: true, versionKey: false });

quizSchema.index({ status: 1, publishedAt: -1 });
quizSchema.index({ title: 'text', description: 'text', tags: 'text' });
quizSchema.index({ creatorId: 1, creationKey: 1 }, { unique: true, sparse: true });
export const Quiz = model('Quiz', quizSchema);

const answerOptionSchema = new Schema({
  key: { type: String, required: true, trim: true, maxlength: 60 },
  text: { type: String, required: true, trim: true, maxlength: 250 },
}, { _id: false });

const questionSchema = new Schema({
  type: { type: String, enum: ['single_choice', 'multiple_choice', 'true_false', 'fill_blank', 'short_answer'], required: true },
  prompt: { type: String, required: true, trim: true, maxlength: 1000 },
  options: { type: [answerOptionSchema], default: [] },
  correctAnswers: { type: [String], default: [] },
  explanation: { type: String, default: '', maxlength: 1000 },
  hint: { type: String, default: '', maxlength: 300 },
  points: { type: Number, default: 1, min: 1, max: 100 },
}, { _id: true });

const quizVersionSchema = new Schema({
  quizId: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true, index: true },
  version: { type: Number, required: true },
  questions: { type: [questionSchema], default: [] },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  note: { type: String, default: '', maxlength: 500 },
}, { timestamps: { createdAt: true, updatedAt: false }, versionKey: false });
quizVersionSchema.index({ quizId: 1, version: 1 }, { unique: true });
export const QuizVersion = model('QuizVersion', quizVersionSchema);
