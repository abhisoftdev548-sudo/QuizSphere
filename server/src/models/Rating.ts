import { model, Schema } from 'mongoose';

const ratingSchema = new Schema({
  contentType: { type: String, enum: ['quiz', 'poll'], required: true },
  contentId: { type: Schema.Types.ObjectId, required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  value: { type: Number, min: 1, max: 5, required: true },
  comment: { type: String, default: '', maxlength: 500 },
}, { timestamps: true, versionKey: false });
ratingSchema.index({ contentType: 1, contentId: 1, userId: 1 }, { unique: true });
export const Rating = model('Rating', ratingSchema);
