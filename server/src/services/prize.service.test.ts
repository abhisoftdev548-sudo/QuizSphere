import test from 'node:test';
import assert from 'node:assert/strict';
import { distributePrize } from './prize.service.js';

test('distributes configured rank shares to eligible finishers', () => {
  const result = distributePrize(
    [{ rank: 1, sharePercent: 70 }, { rank: 2, sharePercent: 30 }],
    [{ id: 'a1', userId: 'u1', score: 100 }, { id: 'a2', userId: 'u2', score: 90 }],
    100,
  );
  assert.deepEqual(result.map((winner) => [winner.rank, winner.amount]), [[1, 70], [2, 30]]);
});

test('splits tied rank shares evenly and apportions indivisible QCoins deterministically', () => {
  const result = distributePrize(
    [{ rank: 1, sharePercent: 100 }],
    [{ id: 'a1', userId: 'u1', score: 100 }, { id: 'a2', userId: 'u2', score: 100 }],
    9,
  );
  assert.deepEqual(result.map((winner) => winner.amount), [5, 4]);
});

test('leaves unclaimed rank shares out of payouts for creator refund', () => {
  const result = distributePrize(
    [{ rank: 1, sharePercent: 60 }, { rank: 2, sharePercent: 40 }],
    [{ id: 'a1', userId: 'u1', score: 100 }],
    100,
  );
  assert.deepEqual(result.map((winner) => winner.amount), [60]);
});
