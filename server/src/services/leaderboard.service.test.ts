import test from 'node:test';
import assert from 'node:assert/strict';
import { quizAttemptLeaderboardPipeline } from './leaderboard.service.js';

test('leaderboard pass rate includes every scored finalized attempt in the selected period', () => {
  const start = new Date('2026-10-01T00:00:00.000Z');
  const pipeline = quizAttemptLeaderboardPipeline({ $gte: start });

  assert.deepEqual(pipeline[0], {
    $match: {
      status: { $in: ['completed', 'expired'] },
      submittedAt: { $gte: start },
      score: { $ne: null },
      passed: { $in: [true, false] },
    },
  });
  assert.deepEqual(pipeline[1], {
    $group: {
      _id: '$userId',
      attempts: { $sum: 1 },
      averageScore: { $avg: '$score' },
      passed: { $sum: { $cond: [{ $eq: ['$passed', true] }, 1, 0] } },
      bestScore: { $max: '$score' },
    },
  });
});
