import { model, Schema } from 'mongoose';

const refreshTokenSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  sessionId: { type: String, required: true, unique: true, index: true },
  tokenHash: { type: String, required: true, unique: true },
  familyId: { type: String, required: true, index: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  revokedAt: { type: Date, default: null },
  replacedBy: { type: Schema.Types.ObjectId, ref: 'RefreshToken', default: null },
  userAgent: { type: String, default: '', maxlength: 500 },
  ipAddress: { type: String, default: '', maxlength: 80 },
}, { timestamps: true, versionKey: false });

export const RefreshToken = model('RefreshToken', refreshTokenSchema);
