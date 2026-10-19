import { model, Schema } from 'mongoose';

const userPassSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  passKey: { type: String, enum: ['create', 'vip', 'pro', 'legend', 'premium'], required: true },
  balance: { type: Number, required: true, min: 0, default: 0 },
}, { timestamps: true, versionKey: false });

userPassSchema.index({ userId: 1, passKey: 1 }, { unique: true });
export const UserPass = model('UserPass', userPassSchema);
