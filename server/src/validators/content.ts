import { z } from 'zod';

const answerOptionSchema = z.object({ key: z.string().trim().min(1).max(60), text: z.string().trim().min(1).max(250) }).strict();
export const questionSchema = z.object({
  type: z.enum(['single_choice', 'multiple_choice', 'true_false', 'fill_blank', 'short_answer']),
  prompt: z.string().trim().min(4).max(1000),
  options: z.array(answerOptionSchema).max(8).default([]),
  correctAnswers: z.array(z.string().trim().min(1).max(250)).min(1).max(8),
  explanation: z.string().trim().max(1000).default(''),
  hint: z.string().trim().max(300).default(''),
  points: z.number().int().min(1).max(100).default(1),
}).strict().superRefine((question, context) => {
  if (question.type === 'single_choice' || question.type === 'true_false' || question.type === 'multiple_choice') {
    const min = question.type === 'true_false' ? 2 : 2;
    if (question.options.length < min || question.options.length > 8) context.addIssue({ code: z.ZodIssueCode.custom, path: ['options'], message: 'Choice questions need 2 to 8 answer options.' });
    const keys = question.options.map((option) => option.key);
    if (new Set(keys).size !== keys.length) context.addIssue({ code: z.ZodIssueCode.custom, path: ['options'], message: 'Option keys must be unique.' });
    if (question.correctAnswers.some((answer) => !keys.includes(answer))) context.addIssue({ code: z.ZodIssueCode.custom, path: ['correctAnswers'], message: 'Select a valid correct option.' });
    if (question.type === 'true_false' && question.options.length !== 2) context.addIssue({ code: z.ZodIssueCode.custom, path: ['options'], message: 'True/false questions need exactly two options.' });
    if (question.type !== 'multiple_choice' && question.correctAnswers.length !== 1) context.addIssue({ code: z.ZodIssueCode.custom, path: ['correctAnswers'], message: 'Choose exactly one correct answer.' });
    if (question.type === 'multiple_choice' && question.correctAnswers.length < 1) context.addIssue({ code: z.ZodIssueCode.custom, path: ['correctAnswers'], message: 'Choose at least one correct answer.' });
  } else if (question.options.length !== 0) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['options'], message: 'Text-answer questions do not use options.' });
  }
});

const commonContent = {
  title: z.string().trim().min(4).max(160),
  description: z.string().trim().max(2000).default(''),
  categoryId: z.string().regex(/^[a-f\d]{24}$/i).optional().nullable(),
  tags: z.array(z.string().trim().min(1).max(30)).max(10).default([]),
};

export const quizDraftSchema = z.object({
  ...commonContent,
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
  language: z.string().trim().min(2).max(12).default('en'),
  coverImageUrl: z.string().url().max(2048).optional().nullable(),
  timeLimitSeconds: z.number().int().min(30).max(7200).optional().nullable(),
  passingScorePercent: z.number().min(0).max(100).default(60),
  entryFee: z.number().int().min(0).default(0),
  questions: z.array(questionSchema).min(1).max(100),
}).strict();

export const pollDraftSchema = z.object({
  title: z.string().trim().min(4).max(160),
  description: z.string().trim().max(2000).default(''),
  categoryId: z.string().regex(/^[a-f\d]{24}$/i).optional().nullable(),
  tags: z.array(z.string().trim().min(1).max(30)).max(10).default([]),
  options: z.array(z.string().trim().min(1).max(160)).min(2).max(10),
  allowMultiple: z.boolean().default(false),
  anonymous: z.boolean().default(true),
  resultVisibility: z.enum(['after_vote', 'after_close', 'public']).default('after_vote'),
  allowVoteChange: z.boolean().default(false),
  startsAt: z.string().datetime().optional().nullable(),
  closesAt: z.string().datetime().optional().nullable(),
  votingFee: z.number().int().min(0).default(0),
}).strict().superRefine((poll, context) => {
  if (new Set(poll.options.map((value) => value.toLowerCase())).size !== poll.options.length) context.addIssue({ code: z.ZodIssueCode.custom, path: ['options'], message: 'Poll options must be unique.' });
  if (poll.startsAt && poll.closesAt && new Date(poll.closesAt) <= new Date(poll.startsAt)) context.addIssue({ code: z.ZodIssueCode.custom, path: ['closesAt'], message: 'Poll closing time must be after its start time.' });
});
