import { model, Schema } from 'mongoose';

const auditSchema = new Schema({
  actorId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  idempotencyKey: { type: String, unique: true, sparse: true },
  action: { type: String, required: true, maxlength: 100 },
  targetType: { type: String, required: true, maxlength: 60 },
  targetId: { type: String, default: '', maxlength: 100 },
  reason: { type: String, default: '', maxlength: 1000 },
  metadata: { type: Schema.Types.Mixed, default: {} },
  ipAddress: { type: String, default: '', maxlength: 80 },
}, { timestamps: { createdAt: true, updatedAt: false }, versionKey: false });

auditSchema.index({ createdAt: -1 });
export const AuditLog = model('AuditLog', auditSchema);
