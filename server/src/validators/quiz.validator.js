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
    type: z.enum(['multiple-choice', 'true-false', 'single-choice']).default('multiple-choice'),
    options: z.array(optionSchema).min(2).max(6).refine(opts => opts.some(o => o.isCorrect), { message: 'At least one correct option required' }),
    explanation: z.string().max(1000).optional(),
    points: z.number().min(1).max(100).default(10),
    order: z.number().optional()
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
    selectedOptionIndexes: z.array(z.number().min(0)).min(1),
    timeSpent: z.number().min(0).optional()
  })).min(1),
  timeTaken: z.number().min(0).optional()
});
