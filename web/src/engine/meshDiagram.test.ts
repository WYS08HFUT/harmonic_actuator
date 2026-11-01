import test from 'node:test';
import assert from 'node:assert/strict';
import { toothRadii } from './meshDiagram.ts';

const close = (actual: number, expected: number, epsilon = 1e-9): void => {
  assert.ok(
    Math.abs(actual - expected) < epsilon,
    `expected ${actual} to be within ${epsilon} of ${expected}`,
  );
};

test('toothRadii(50) matches the spec tooth radii', () => {
  const radii = toothRadii(50);
  close(radii.fsTip, 25.5);
  close(radii.fsRoot, 24.375);
  close(radii.csTip, 25.0);
  close(radii.csRoot, 26.125);
});

test('toothRadii(20) scales with the 1.25 module', () => {
  const radii = toothRadii(20);
  close(radii.fsTip, 26.25);
  close(radii.fsRoot, 23.4375);
  close(radii.csTip, 25.0);
  close(radii.csRoot, 27.8125);
});
