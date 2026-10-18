import { model, Schema } from 'mongoose';

const platformConfigSchema = new Schema({
  _id: { type: String, default: 'global' },
  signupBonus: { type: Number, default: 100, min: 0 },
  freeQuizQuestionLimit: { type: Number, default: 10, min: 1, max: 100 },
  additionalQuestionFee: { type: Number, default: 0, min: 0 },
  maxQuizEntryFee: { type: Number, default: 500, min: 0 },
  maxPollVoteFee: { type: Number, default: 100, min: 0 },
  maxQuizQuestions: { type: Number, default: 50, min: 1, max: 100 },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true, versionKey: false });

export const PlatformConfig = model('PlatformConfig', platformConfigSchema);
