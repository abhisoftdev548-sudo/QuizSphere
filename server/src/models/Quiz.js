import mongoose from 'mongoose';

const quizSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 200 },
  description: { type: String, required: true, trim: true, maxlength: 2000 },
  category: { type: String, required: true, trim: true, default: 'General' },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  questions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
  isPublic: { type: Boolean, default: true },
  status: { type: String, enum: ['draft', 'pending', 'approved', 'rejected'], default: 'pending', index: true },
  rejectionReason: { type: String, default: '' },
  timeLimit: { type: Number, default: 10, min: 1, max: 180 }, // minutes
  passingScore: { type: Number, default: 60, min: 0, max: 100 },
  totalAttempts: { type: Number, default: 0 },
  avgScore: { type: Number, default: 0 },
  totalRatings: { type: Number, default: 0 },
  avgRating: { type: Number, default: 0 },
  thumbnail: { type: String, default: '' },
  tags: [{ type: String, trim: true }],
  qcoinReward: { type: Number, default: 10, min: 0 },
  qcoinCost: { type: Number, default: 0, min: 0 }, // cost to attempt if premium
  featured: { type: Boolean, default: false }
}, { timestamps: true });

quizSchema.index({ status: 1, isPublic: 1 });
quizSchema.index({ category: 1 });
quizSchema.index({ author: 1 });
quizSchema.index({ createdAt: -1 });
quizSchema.index({ title: 'text', description: 'text', tags: 'text' });

const Quiz = mongoose.model('Quiz', quizSchema);
export default Quiz;
