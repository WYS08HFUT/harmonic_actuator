import test from 'node:test';
import assert from 'node:assert/strict';
import { explodeFactor } from './exploder.ts';

test('explodeFactor is zero at progress zero', () => {
  assert.equal(explodeFactor(0, 0, 10, false), 0);
});

test('explodeFactor reaches one for the first and last parts', () => {
  assert.equal(explodeFactor(1, 0, 10, false), 1);
  assert.equal(explodeFactor(1, 10, 10, false), 1);
});

test('explodeFactor respects the order delay', () => {
  assert.equal(explodeFactor(0.2, 10, 10, false), 0);
});

test('reduced motion snaps to 0, 50, or 100 percent', () => {
  assert.equal(explodeFactor(0, 0, 10, true), 0);
  assert.equal(explodeFactor(0.24, 0, 10, true), 0);
  assert.equal(explodeFactor(0.5, 0, 10, true), 0.5);
  assert.equal(explodeFactor(0.76, 0, 10, true), 1);
  assert.equal(explodeFactor(1, 0, 10, true), 1);
});
