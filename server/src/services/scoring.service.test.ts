import test from 'node:test';
import assert from 'node:assert/strict';
import { isAnswerCorrect, scoreAnswers } from './scoring.service.js';

test('scores weighted quiz answers on the server-calculated question set', () => {
  const questions = [
    { _id: 'q1', type: 'single_choice', points: 2, correctAnswers: ['a'] },
    { _id: 'q2', type: 'multiple_choice', points: 3, correctAnswers: ['b', 'c'] },
    { _id: 'q3', type: 'fill_blank', points: 5, correctAnswers: ['Jupiter'] },
  ];
  const result = scoreAnswers(questions, [
    { questionId: 'q1', selections: ['a'] },
    { questionId: 'q2', selections: ['c', 'b'] },
    { questionId: 'q3', textAnswer: '  jUPITER  ' },
  ]);
  assert.deepEqual(result, { maxScore: 10, earned: 10, correctCount: 3, percent: 100 });
});

test('requires exact set equality for multiple-choice grading', () => {
  const question = { type: 'multiple_choice', points: 1, correctAnswers: ['a', 'b'] };
  assert.equal(isAnswerCorrect(question, { questionId: 'q', selections: ['b', 'a'] }), true);
  assert.equal(isAnswerCorrect(question, { questionId: 'q', selections: ['a'] }), false);
  assert.equal(isAnswerCorrect(question, { questionId: 'q', selections: ['a', 'b', 'c'] }), false);
});

test('unanswered questions count as incorrect and scores round consistently', () => {
  const questions = [
    { _id: 'q1', type: 'true_false', points: 1, correctAnswers: ['true'] },
    { _id: 'q2', type: 'short_answer', points: 2, correctAnswers: ['exact phrase'] },
  ];
  const result = scoreAnswers(questions, [{ questionId: 'q2', textAnswer: 'exact phrase!' }]);
  assert.deepEqual(result, { maxScore: 3, earned: 0, correctCount: 0, percent: 0 });
});
