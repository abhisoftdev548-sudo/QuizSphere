import mongoose from 'mongoose';

const qcoinTransactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['earn', 'spend', 'purchase', 'bonus', 'penalty', 'refund'], required: true },
  amount: { type: Number, required: true }, // positive for earn/purchase, negative for spend/penalty but we store signed
  balanceAfter: { type: Number, required: true },
  description: { type: String, required: true, trim: true },
  relatedId: { type: mongoose.Schema.Types.ObjectId, default: null }, // quiz, poll, attempt, etc
  relatedType: { type: String, enum: ['quiz', 'poll', 'attempt', 'purchase', 'system', 'admin'], default: 'system' },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: { createdAt: true, updatedAt: false } });

// Immutable ledger - prevent updates
qcoinTransactionSchema.pre('findOneAndUpdate', function() {
  throw new Error('QCoin transactions are immutable and cannot be updated');
});
qcoinTransactionSchema.pre('updateOne', function() {
  throw new Error('QCoin transactions are immutable and cannot be updated');
});
qcoinTransactionSchema.pre('updateMany', function() {
  throw new Error('QCoin transactions are immutable and cannot be updated');
});

qcoinTransactionSchema.index({ user: 1, createdAt: -1 });
qcoinTransactionSchema.index({ type: 1 });

const QCoinTransaction = mongoose.model('QCoinTransaction', qcoinTransactionSchema);
export default QCoinTransaction;
