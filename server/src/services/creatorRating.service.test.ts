import test from 'node:test';
import assert from 'node:assert/strict';
import { qualifiesCreatorRating } from './creatorRating.service.js';

test('creator ratings affect rank promotion only after five participant ratings', () => {
  assert.equal(qualifiesCreatorRating(0), false);
  assert.equal(qualifiesCreatorRating(4), false);
  assert.equal(qualifiesCreatorRating(5), true);
  assert.equal(qualifiesCreatorRating(6), true);
});
