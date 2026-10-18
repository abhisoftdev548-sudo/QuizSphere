import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
  reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  targetType: { type: String, enum: ['quiz', 'poll', 'user', 'review', 'comment'], required: true },
  targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
  reason: { type: String, enum: ['spam', 'inappropriate', 'plagiarism', 'misinformation', 'harassment', 'other'], required: true },
  description: { type: String, required: true, trim: true, maxlength: 1000 },
  status: { type: String, enum: ['pending', 'reviewed', 'resolved', 'dismissed'], default: 'pending', index: true },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reviewNotes: { type: String, default: '' },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' }
}, { timestamps: true });

reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ targetType: 1, targetId: 1 });

const Report = mongoose.model('Report', reportSchema);
export default Report;
