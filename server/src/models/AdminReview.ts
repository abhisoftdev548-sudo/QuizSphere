import { model, Schema } from 'mongoose';

const reviewSchema = new Schema({
  targetType: { type: String, enum: ['quiz', 'poll'], required: true },
  targetId: { type: Schema.Types.ObjectId, required: true, index: true },
  contentVersion: { type: Number, required: true },
  adminId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  decision: { type: String, enum: ['approved', 'rejected', 'changes_requested', 'unpublished'], required: true },
  note: { type: String, required: true, maxlength: 1000 },
  qualityRating: { type: Number, min: 1, max: 5, default: null },
}, { timestamps: { createdAt: true, updatedAt: false }, versionKey: false });
reviewSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });
export const AdminReview = model('AdminReview', reviewSchema);
