import mongoose from 'mongoose';

const optionSchema = new mongoose.Schema({
  text: { type: String, required: true, trim: true },
  isCorrect: { type: Boolean, default: false }
}, { _id: false });

const questionSchema = new mongoose.Schema({
  quiz: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true, index: true },
  text: { type: String, required: true, trim: true },
  type: { type: String, enum: ['multiple-choice', 'true-false', 'single-choice', 'fill-blank'], default: 'multiple-choice' },
  options: { 
    type: [optionSchema], 
    default: [],
    validate: {
      validator: function(v) {
        if (this.type === 'fill-blank') return true; // no options needed
        return v && v.length >= 2;
      },
      message: 'At least 2 options required for choice questions'
    }
  },
  correctAnswer: { type: String, default: '', trim: true }, // for fill-blank
  explanation: { type: String, default: '' },
  points: { type: Number, default: 10, min: 1 },
  order: { type: Number, default: 0 },
  image: { type: String, default: '' }
}, { timestamps: true });

questionSchema.index({ quiz: 1, order: 1 });

const Question = mongoose.model('Question', questionSchema);
export default Question;
