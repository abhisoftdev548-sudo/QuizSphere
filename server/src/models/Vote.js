import mongoose from 'mongoose';

const voteSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  poll: { type: mongoose.Schema.Types.ObjectId, ref: 'Poll', required: true, index: true },
  optionIndexes: [{ type: Number, required: true }], // indexes of selected options
  optionIds: [{ type: mongoose.Schema.Types.ObjectId }], // actual option _ids for safety
}, { timestamps: true });

voteSchema.index({ user: 1, poll: 1 }, { unique: true });

const Vote = mongoose.model('Vote', voteSchema);
export default Vote;
