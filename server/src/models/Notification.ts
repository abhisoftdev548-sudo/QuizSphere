import { model, Schema } from 'mongoose';

const notificationSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, required: true, enum: ['submission_approved', 'submission_rejected', 'changes_requested', 'content_published', 'content_closed', 'result_available', 'qcoin_earned', 'qcoin_spent', 'prize_distributed', 'account_update', 'platform_update'] },
  title: { type: String, required: true, maxlength: 120 },
  message: { type: String, required: true, maxlength: 500 },
  link: { type: String, default: null, maxlength: 300 },
  readAt: { type: Date, default: null },
  relatedType: { type: String, enum: ['quiz', 'poll', 'attempt', 'ledger', null], default: null },
  relatedId: { type: Schema.Types.ObjectId, default: null },
}, { timestamps: true, versionKey: false });
notificationSchema.index({ userId: 1, createdAt: -1 });
export const Notification = model('Notification', notificationSchema);
