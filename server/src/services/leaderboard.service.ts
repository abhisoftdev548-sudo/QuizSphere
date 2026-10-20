import type { PipelineStage } from 'mongoose';

type DateMatch = { $gte: Date } | { $exists: boolean };

export function quizAttemptLeaderboardPipeline(dateMatch: DateMatch): PipelineStage[] {
  return [
    {
      $match: {
        status: { $in: ['completed', 'expired'] },
        submittedAt: dateMatch,
        score: { $ne: null },
        passed: { $in: [true, false] },
      },
    },
    {
      $group: {
        _id: '$userId',
        attempts: { $sum: 1 },
        averageScore: { $avg: '$score' },
        passed: { $sum: { $cond: [{ $eq: ['$passed', true] }, 1, 0] } },
        bestScore: { $max: '$score' },
      },
    },
  ];
}
