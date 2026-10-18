import { z } from 'zod';

export const createPollSchema = z.object({
  question: z.string().min(5).max(500),
  description: z.string().max(1000).optional(),
  options: z.array(z.object({
    text: z.string().min(1).max(200)
  })).min(2).max(6),
  category: z.string().min(1).max(50).default('General'),
  isMultipleChoice: z.boolean().default(false),
  expiresAt: z.string().datetime().optional().or(z.date().optional()),
  tags: z.array(z.string()).max(10).optional(),
  thumbnail: z.string().url().optional().or(z.literal('')),
  isPublic: z.boolean().default(true)
});

export const updatePollSchema = createPollSchema.partial();
export const reviewPollSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  rejectionReason: z.string().max(500).optional()
});

export const votePollSchema = z.object({
  optionIndexes: z.array(z.number().min(0)).min(1)
});
