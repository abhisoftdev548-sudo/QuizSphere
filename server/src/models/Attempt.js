import mongoose from 'mongoose';

const answerSchema = new mongoose.Schema({
  question: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
  selectedOptionIndexes: [{ type: Number }],
  textAnswer: { type: String, default: '' },
  isCorrect: { type: Boolean, default: false },
  pointsEarned: { type: Number, default: 0 },
  timeSpent: { type: Number, default: 0 } // seconds
}, { _id: false });

const attemptSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  quiz: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true, index: true },
  answers: [answerSchema],
  score: { type: Number, default: 0 },
  totalPoints: { type: Number, default: 0 },
  percentage: { type: Number, default: 0 },
  passed: { type: Boolean, default: false },
  timeTaken: { type: Number, default: 0 }, // seconds
  qcoinsEarned: { type: Number, default: 0 },
  completedAt: { type: Date, default: Date.now },
  ipAddress: { type: String }
}, { timestamps: true });

attemptSchema.index({ user: 1, quiz: 1 });
attemptSchema.index({ quiz: 1, percentage: -1 });
attemptSchema.index({ user: 1, completedAt: -1 });
attemptSchema.index({ completedAt: -1 });

const Attempt = mongoose.model('Attempt', attemptSchema);
export default Attempt;
