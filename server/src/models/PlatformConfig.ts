import { model, Schema } from 'mongoose';
import { PASS_PRODUCTS } from '../constants/passes.js';

const platformConfigSchema = new Schema({
  _id: { type: String, default: 'global' },
  signupBonus: { type: Number, default: 100, min: 0 },
  freeQuizQuestionLimit: { type: Number, default: 10, min: 1, max: 100 },
  specialEventRequiresCreatePass: { type: Boolean, default: true },
  additionalQuestionFee: { type: Number, default: 0, min: 0 },
  maxQuizEntryFee: { type: Number, default: 500, min: 0 },
  maxPollVoteFee: { type: Number, default: 100, min: 0 },
  maxQuizQuestions: { type: Number, default: 50, min: 1, max: 100 },
  passProducts: {
    type: [{
      key: { type: String, enum: PASS_PRODUCTS.map((item) => item.key), required: true },
      name: { type: String, required: true, maxlength: 40 },
      kind: { type: String, enum: ['create', 'participation'], required: true },
      price: { type: Number, required: true, min: 0, max: 100000 },
      buybackPrice: { type: Number, default: 0, min: 0, max: 100000 },
      active: { type: Boolean, default: true },
    }],
    default: () => PASS_PRODUCTS.map((item) => ({ ...item })),
  },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true, versionKey: false });

export const PlatformConfig = model('PlatformConfig', platformConfigSchema);
