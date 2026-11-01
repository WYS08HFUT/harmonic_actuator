import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  buildGearSet,
  externalToothHalfAngle,
  gearParams,
  internalToothHalfAngle,
  snapRatio,
} from './harmonicGears.ts';

const close = (actual: number, expected: number, epsilon = 1e-9): void => {
  assert.ok(
    Math.abs(actual - expected) < epsilon,
    `expected ${actual} to be within ${epsilon} of ${expected}`,
  );
};

test('snapRatio clamps to 20-100 and rounds to 0.5', () => {
  assert.equal(snapRatio(49.7), 49.5);
  assert.equal(snapRatio(19), 20);
  assert.equal(snapRatio(101), 100);
  assert.equal(snapRatio(50), 50);
  assert.equal(snapRatio(49.8), 50);
});

test('gearParams(50) yields the 100/102 module-0.5 gear set', () => {
  const p = gearParams(50);
  assert.equal(p.ratio, 50);
  assert.equal(p.zf, 100);
  assert.equal(p.zc, 102);
  close(p.module, 0.5);
  close(p.fsPitchRadius, 25);
  close(p.fsTipRadius, 25.5);
  close(p.fsRootRadius, 24.375);
  close(p.fsInnerRadius, 23.525);
  close(p.csPitchRadius, 25.5);
  close(p.csTipRadius, 25);
  close(p.csRootRadius, 26.125);
  close(p.wgMajorRadius, 24.025);
  close(p.wgMinorRadius, 23.025);
});

test('gearParams scales the module with the ratio', () => {
  const p20 = gearParams(20);
  assert.equal(p20.zf, 40);
  assert.equal(p20.zc, 42);
  close(p20.module, 1.25);
  close(p20.fsPitchRadius, 25);

  const p100 = gearParams(100);
  assert.equal(p100.zf, 200);
  assert.equal(p100.zc, 202);
  close(p100.module, 0.25);
  close(p100.fsPitchRadius, 25);
});

test('wave generator stroke is twice the module at every ratio', () => {
  for (const ratio of [20, 35.5, 50, 77, 100]) {
    const p = gearParams(ratio);
    close(p.wgMajorRadius - p.wgMinorRadius, 2 * p.module);
    close(p.wgMajorRadius, p.fsInnerRadius + p.module);
    close(p.wgMinorRadius, p.fsInnerRadius - p.module);
  }
});

test('gearParams rejects ratios outside 20-100', () => {
  assert.throws(() => gearParams(19), /ratio/);
  assert.throws(() => gearParams(101), /ratio/);
});

test('flexspline teeth taper toward the tip while circular spline teeth widen inward', () => {
  const p = gearParams(50);
  assert.ok(
    externalToothHalfAngle(p, p.fsTipRadius) < externalToothHalfAngle(p, p.fsRootRadius),
    'external tooth must be narrower at the tip',
  );
  assert.ok(
    internalToothHalfAngle(p, p.csTipRadius) > internalToothHalfAngle(p, p.csRootRadius),
    'internal tooth must be wider at the inward tip',
  );
  assert.ok(
    externalToothHalfAngle(p, p.fsTipRadius) < Math.PI / p.zf / 2,
    'flexspline tooth must be narrower than half a pitch',
  );
});

test('buildGearSet produces the five named harmonic children with finite bounds', () => {
  const group = buildGearSet(gearParams(50));
  const names = group.children.map((child) => child.name);
  for (const expected of [
    'Flexspline_Cup',
    'Circular_Spline_Ring',
    'Wave_Generator_Cam',
    'Wave_Generator_Balls',
    'Wave_Generator_Flexible_Race',
  ]) {
    assert.ok(names.includes(expected), `missing ${expected}: ${names.join(', ')}`);
  }

  group.updateMatrixWorld(true);
  for (const child of group.children) {
    const box = new THREE.Box3().setFromObject(child);
    assert.ok(!box.isEmpty(), `${child.name} is empty`);
    for (const value of [...box.min.toArray(), ...box.max.toArray()]) {
      assert.ok(Number.isFinite(value), `${child.name} has a non-finite bound`);
    }
  }
});
