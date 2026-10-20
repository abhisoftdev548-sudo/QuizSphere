import { model, Schema } from 'mongoose';

const creatorRatingSchema = new Schema({
  quizId: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true, index: true },
  creatorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  raterId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
}, { timestamps: true, versionKey: false });

creatorRatingSchema.index({ quizId: 1, raterId: 1 }, { unique: true });
creatorRatingSchema.index({ creatorId: 1, createdAt: -1 });

export const CreatorRating = model('CreatorRating', creatorRatingSchema, 'creatorratings');
