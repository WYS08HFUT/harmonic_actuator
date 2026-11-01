import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Drive, outputRpm, VISUAL_SCALE } from './drive.ts';

const close = (actual: number, expected: number, epsilon = 1e-9): void => {
  assert.ok(
    Math.abs(actual - expected) < epsilon,
    `expected ${actual} to be within ${epsilon} of ${expected}`,
  );
};

test('outputRpm divides the input speed by the ratio', () => {
  assert.equal(outputRpm(1000, 50), 20);
  assert.equal(outputRpm(0, 50), 0);
  close(outputRpm(1000, 30), 33.3333333, 1e-6);
});

test('update advances the wave at visual scale and the output backwards', () => {
  const input = new THREE.Object3D();
  const output = new THREE.Object3D();
  const cage = new THREE.Object3D();
  const balls = new THREE.Object3D();

  const drive = new Drive({
    input: [input],
    output: [output],
    cage: [cage],
    halfSpeed: [balls],
  });
  drive.setRatio(50);
  drive.setInputRpm(1000);
  drive.update(1);

  const expectedWave = 2 * Math.PI * (1000 / 60) * VISUAL_SCALE;
  close(drive.waveAngle, expectedWave);
  close(drive.outputAngle, -expectedWave / 50);
  close(input.rotation.z, expectedWave);
  close(output.rotation.z, -expectedWave / 50);
  close(cage.rotation.z, -expectedWave / 50 / 2);
  close(balls.rotation.z, expectedWave / 2);
});

test('updates every flexspline material with the local wave phase', () => {
  const first = new THREE.MeshStandardMaterial();
  const second = new THREE.MeshStandardMaterial();
  first.userData.flexUniforms = { uFlexPsi: { value: 0 } };
  second.userData.flexUniforms = { uFlexPsi: { value: 0 } };

  const drive = new Drive({ input: [], output: [], flexMaterials: [first, second] });
  drive.setRatio(50);
  drive.setInputRpm(1000);
  drive.update(1);

  const expected = drive.waveAngle - drive.outputAngle;
  assert.equal(first.userData.flexUniforms.uFlexPsi.value, expected);
  assert.equal(second.userData.flexUniforms.uFlexPsi.value, expected);
});

test('stopping the input preserves the accumulated angles', () => {
  const output = new THREE.Object3D();
  const drive = new Drive({ input: [], output: [output] });
  drive.setRatio(50);
  drive.setInputRpm(1000);
  drive.update(0.5);
  const angle = drive.outputAngle;
  drive.setInputRpm(0);
  drive.update(1);
  assert.equal(drive.outputAngle, angle);
});
