import { model, Schema, type InferSchemaType } from 'mongoose';

const userSchema = new Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254, index: true },
  username: { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 30, index: true },
  displayName: { type: String, required: true, trim: true, maxlength: 80 },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['user', 'admin'], default: 'user', required: true },
  status: { type: String, enum: ['active', 'suspended', 'closed'], default: 'active', required: true },
  walletBalance: { type: Number, min: 0, default: 0, required: true },
  signupBonusAwardedAt: { type: Date, default: null },
  avatarUrl: { type: String, default: null, maxlength: 2048 },
  bio: { type: String, default: '', maxlength: 300 },
  emailVerifiedAt: { type: Date, default: null },
  lastActiveAt: { type: Date, default: null },
}, { timestamps: true, versionKey: false });

export type UserRecord = InferSchemaType<typeof userSchema>;
export const User = model('User', userSchema);
