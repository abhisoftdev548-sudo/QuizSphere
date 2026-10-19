import test from 'node:test';
import assert from 'node:assert/strict';
import { requiresCreatePass } from './quizPolicy.service.js';

test('participation pass requirements do not make a within-limit quiz require a Create Pass', () => {
  assert.equal(requiresCreatePass(10, 10, 'general', false), false);
});

test('question counts above the admin-configured free limit require a Create Pass', () => {
  assert.equal(requiresCreatePass(11, 10, 'general', false), true);
});

test('Special Event Creator Pass requirement follows the admin toggle', () => {
  assert.equal(requiresCreatePass(10, 10, 'special_event', true), true);
  assert.equal(requiresCreatePass(10, 10, 'special_event', false), false);
});
