import { model, Schema } from 'mongoose';

const answerSchema = new Schema({
  questionId: { type: String, required: true },
  selections: { type: [String], default: [] },
  textAnswer: { type: String, default: '', maxlength: 1000 },
}, { _id: false });

const attemptSchema = new Schema({
  quizId: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true, index: true },
  quizVersionId: { type: Schema.Types.ObjectId, ref: 'QuizVersion', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  requestKey: { type: String, required: true },
  status: { type: String, enum: ['in_progress', 'completed', 'expired'], default: 'in_progress', index: true },
  answers: { type: [answerSchema], default: [] },
  score: { type: Number, default: null },
  maxScore: { type: Number, default: null },
  correctCount: { type: Number, default: null },
  passed: { type: Boolean, default: null },
  startedAt: { type: Date, required: true },
  expiresAt: { type: Date, default: null },
  submittedAt: { type: Date, default: null },
  entryFee: { type: Number, default: 0 },
  rewardAmount: { type: Number, default: 0 },
}, { timestamps: true, versionKey: false });

attemptSchema.index({ userId: 1, quizId: 1, requestKey: 1 }, { unique: true });
attemptSchema.index({ quizId: 1, status: 1, score: -1, submittedAt: 1 });
export const QuizAttempt = model('QuizAttempt', attemptSchema);
