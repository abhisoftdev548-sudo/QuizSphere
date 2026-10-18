import { model, Schema } from 'mongoose';

const reportSchema = new Schema({
  reporterId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  targetType: { type: String, enum: ['quiz', 'poll', 'user'], required: true },
  targetId: { type: Schema.Types.ObjectId, required: true, index: true },
  reason: { type: String, enum: ['inappropriate', 'spam', 'incorrect', 'fraud', 'other'], required: true },
  description: { type: String, default: '', maxlength: 1000 },
  status: { type: String, enum: ['open', 'reviewing', 'resolved', 'dismissed'], default: 'open', index: true },
  resolvedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  resolution: { type: String, default: '', maxlength: 1000 },
}, { timestamps: true, versionKey: false });
reportSchema.index({ reporterId: 1, targetType: 1, targetId: 1 }, { unique: true });
export const Report = model('Report', reportSchema);
