import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['quiz_approved', 'quiz_rejected', 'poll_approved', 'poll_rejected', 'new_rating', 'qcoin_earned', 'qcoin_spent', 'system', 'report_update', 'achievement', 'quiz_attempt', 'poll_vote'], required: true },
  title: { type: String, required: true, trim: true },
  message: { type: String, required: true, trim: true },
  isRead: { type: Boolean, default: false, index: true },
  link: { type: String, default: '' },
  relatedId: { type: mongoose.Schema.Types.ObjectId, default: null },
  relatedType: { type: String, default: '' }
}, { timestamps: true });

notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
