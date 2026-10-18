import { model, Schema } from 'mongoose';

const passwordResetSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tokenHash: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  usedAt: { type: Date, default: null },
}, { timestamps: true, versionKey: false });

passwordResetSchema.index({ userId: 1, usedAt: 1 });
export const PasswordResetToken = model('PasswordResetToken', passwordResetSchema);
