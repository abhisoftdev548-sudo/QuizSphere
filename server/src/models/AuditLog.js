import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true, trim: true }, // e.g., 'approve_quiz', 'reject_poll', 'ban_user'
  targetType: { type: String, required: true, trim: true }, // quiz, poll, user, report, settings
  targetId: { type: mongoose.Schema.Types.ObjectId, default: null },
  details: { type: mongoose.Schema.Types.Mixed, default: {} },
  ip: { type: String, default: '' },
  userAgent: { type: String, default: '' }
}, { timestamps: { createdAt: true, updatedAt: false } });

auditLogSchema.index({ admin: 1, createdAt: -1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ targetType: 1, targetId: 1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;
