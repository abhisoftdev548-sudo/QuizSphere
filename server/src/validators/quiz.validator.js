import { z } from 'zod';

const optionSchema = z.object({
  text: z.string().min(1).max(500),
  isCorrect: z.boolean()
});

export const createQuizSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(2000),
  category: z.string().min(1).max(50),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  timeLimit: z.number().min(1).max(180).default(10),
  passingScore: z.number().min(0).max(100).default(60),
  qcoinReward: z.number().min(0).max(1000).default(10),
  qcoinCost: z.number().min(0).max(1000).default(0),
  tags: z.array(z.string()).max(10).optional(),
  thumbnail: z.string().url().optional().or(z.literal('')),
  isPublic: z.boolean().default(true),
  questions: z.array(z.object({
    text: z.string().min(3).max(1000),
    type: z.enum(['multiple-choice', 'true-false', 'single-choice', 'fill-blank']).default('multiple-choice'),
    options: z.array(optionSchema).min(0).max(6).optional(),
    correctAnswer: z.string().max(500).optional(),
    explanation: z.string().max(1000).optional(),
    points: z.number().min(1).max(100).default(10),
    order: z.number().optional()
  }).superRefine((q, ctx) => {
    if (q.type === 'fill-blank') {
      if (!q.correctAnswer || q.correctAnswer.trim().length === 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Correct answer required for fill in the blank', path: ['correctAnswer'] });
      }
    } else {
      if (!q.options || q.options.length < 2) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'At least 2 options required', path: ['options'] });
      } else if (!q.options.some(o => o.isCorrect)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'At least one correct option required', path: ['options'] });
      }
    }
  })).min(1).max(50)
});

export const updateQuizSchema = createQuizSchema.partial().extend({
  status: z.enum(['draft', 'pending', 'approved', 'rejected']).optional()
});

export const reviewQuizSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  rejectionReason: z.string().max(500).optional()
});

export const attemptQuizSchema = z.object({
  answers: z.array(z.object({
    questionId: z.string(),
    selectedOptionIndexes: z.array(z.number().min(0)).optional(),
    textAnswer: z.string().max(500).optional(),
    timeSpent: z.number().min(0).optional()
  }).superRefine((a, ctx) => {
    if ((!a.selectedOptionIndexes || a.selectedOptionIndexes.length === 0) && !a.textAnswer) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Answer required' });
    }
  })).min(1),
  timeTaken: z.number().min(0).optional()
});
