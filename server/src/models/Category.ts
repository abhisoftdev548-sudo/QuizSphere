import { model, Schema } from 'mongoose';

const categorySchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 60 },
  slug: { type: String, required: true, lowercase: true, trim: true },
  contentType: { type: String, enum: ['quiz', 'poll', 'both'], required: true, default: 'both' },
  description: { type: String, default: '', maxlength: 200 },
  parentId: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
  isActive: { type: Boolean, default: true },
}, { timestamps: true, versionKey: false });

categorySchema.index({ slug: 1, contentType: 1 }, { unique: true });
export const Category = model('Category', categorySchema);
