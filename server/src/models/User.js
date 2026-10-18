import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 30 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6, select: false },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  avatar: { type: String, default: '' },
  bio: { type: String, default: '', maxlength: 500 },
  points: { type: Number, default: 0 },
  qcoins: { type: Number, default: 100 }, // starting bonus
  level: { type: Number, default: 1 },
  quizzesCreated: { type: Number, default: 0 },
  quizzesCompleted: { type: Number, default: 0 },
  pollsCreated: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date },
  preferences: {
    emailNotifications: { type: Boolean, default: true },
    theme: { type: String, enum: ['light', 'dark'], default: 'light' }
  }
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
  this.password = await bcrypt.hash(this.password, saltRounds);
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

// Index for leaderboard
userSchema.index({ points: -1 });
userSchema.index({ qcoins: -1 });

const User = mongoose.model('User', userSchema);
export default User;
