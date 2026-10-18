import mongoose from 'mongoose';

const pollOptionSchema = new mongoose.Schema({
  text: { type: String, required: true, trim: true },
  votes: { type: Number, default: 0 }
}, { _id: true });

const pollSchema = new mongoose.Schema({
  question: { type: String, required: true, trim: true, maxlength: 500 },
  description: { type: String, default: '', maxlength: 1000 },
  options: { type: [pollOptionSchema], required: true, validate: v => v.length >= 2 && v.length <= 6 },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  category: { type: String, default: 'General', trim: true },
  status: { type: String, enum: ['draft', 'pending', 'approved', 'rejected'], default: 'pending', index: true },
  rejectionReason: { type: String, default: '' },
  isMultipleChoice: { type: Boolean, default: false },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 7*24*60*60*1000) },
  totalVotes: { type: Number, default: 0 },
  isPublic: { type: Boolean, default: true },
  tags: [{ type: String, trim: true }],
  thumbnail: { type: String, default: '' }
}, { timestamps: true });

pollSchema.index({ status: 1, isPublic: 1 });
pollSchema.index({ expiresAt: 1 });

const Poll = mongoose.model('Poll', pollSchema);
export default Poll;
