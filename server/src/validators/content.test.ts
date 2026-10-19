import test from 'node:test';
import assert from 'node:assert/strict';
import { pollDraftSchema, quizDraftSchema } from './content.js';

const baseQuiz = {
  title: 'World geography basics', description: 'A short set of geography questions.', difficulty: 'beginner', language: 'en',
  passingScorePercent: 60, entryFee: 0,
  questions: [{ type: 'single_choice', prompt: 'Which is a continent?', options: [{ key: 'a', text: 'Africa' }, { key: 'b', text: 'Atlantic' }], correctAnswers: ['a'], explanation: '', hint: '', points: 1 }],
};

test('accepts a well-formed quiz draft without exposing business rules in the payload', () => {
  const result = quizDraftSchema.safeParse(baseQuiz);
  assert.equal(result.success, true);
  if (result.success) assert.equal(result.data.timeLimitSeconds, 600);
});

test('accepts Special Event rank prizes and required participation passes with a schedule', () => {
  const result = quizDraftSchema.safeParse({
    ...baseQuiz,
    quizType: 'special_event',
    requiredPassKey: 'vip',
    creatorFundedPrize: 150,
    prizeRules: [{ rank: 1, sharePercent: 70 }, { rank: 2, sharePercent: 30 }],
    startsAt: '2099-01-01T00:00:00.000Z',
    closesAt: '2099-01-02T00:00:00.000Z',
  });
  assert.equal(result.success, true);
});

test('accepts a General Quiz fixed reward without schedule dates or rank shares', () => {
  const result = quizDraftSchema.safeParse({
    ...baseQuiz,
    creatorFundedPrize: 100,
    rewardPerWinner: 10,
  });
  assert.equal(result.success, true);
});

test('rejects a General Quiz that has event dates or rank shares', () => {
  const result = quizDraftSchema.safeParse({
    ...baseQuiz,
    closesAt: '2099-01-02T00:00:00.000Z',
  });
  assert.equal(result.success, false);
});

test('rejects a Special Event prize without a full rank split or event schedule', () => {
  const result = quizDraftSchema.safeParse({
    ...baseQuiz,
    quizType: 'special_event',
    creatorFundedPrize: 100,
    prizeRules: [{ rank: 1, sharePercent: 70 }],
    startsAt: '2099-01-01T00:00:00.000Z',
    closesAt: '2099-01-02T00:00:00.000Z',
  });
  assert.equal(result.success, false);
});

test('rejects a quiz answer key that does not map to an option', () => {
  const result = quizDraftSchema.safeParse({ ...baseQuiz, questions: [{ ...baseQuiz.questions[0], correctAnswers: ['missing'] }] });
  assert.equal(result.success, false);
});

test('rejects duplicate poll options and invalid closing windows', () => {
  const result = pollDraftSchema.safeParse({
    title: 'Choose a favorite', description: '', options: ['Tea', 'tea'], allowMultiple: false,
    anonymous: true, resultVisibility: 'after_vote', allowVoteChange: false, votingFee: 0,
    startsAt: '2027-01-01T00:00:00.000Z', closesAt: '2026-01-01T00:00:00.000Z',
  });
  assert.equal(result.success, false);
});
