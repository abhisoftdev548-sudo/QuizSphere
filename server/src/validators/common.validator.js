import { z } from 'zod';

export const ratingSchema = z.object({
  targetType: z.enum(['quiz', 'poll']),
  targetId: z.string(),
  rating: z.number().min(1).max(5),
  review: z.string().max(1000).optional()
});

export const reportSchema = z.object({
  targetType: z.enum(['quiz', 'poll', 'user', 'review', 'comment']),
  targetId: z.string(),
  reason: z.enum(['spam', 'inappropriate', 'plagiarism', 'misinformation', 'harassment', 'other']),
  description: z.string().min(10).max(1000)
});

export const qcoinPurchaseSchema = z.object({
  amount: z.number().min(10).max(10000),
  packageId: z.string().optional()
});

export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().optional(),
  category: z.string().optional(),
  difficulty: z.string().optional(),
  status: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional()
});
