import mongoose from 'mongoose';

const ratingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  targetType: { type: String, enum: ['quiz', 'poll'], required: true },
  targetId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  review: { type: String, default: '', maxlength: 1000, trim: true },
  isPublic: { type: Boolean, default: true }
}, { timestamps: true });

ratingSchema.index({ targetType: 1, targetId: 1 });
ratingSchema.index({ user: 1, targetType: 1, targetId: 1 }, { unique: true });

const Rating = mongoose.model('Rating', ratingSchema);
export default Rating;
