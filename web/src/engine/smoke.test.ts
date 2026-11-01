import test from 'node:test';
import assert from 'node:assert/strict';
import { add } from './smoke.ts';

test('test runner works', () => {
  assert.equal(add(2, 3), 5);
});
