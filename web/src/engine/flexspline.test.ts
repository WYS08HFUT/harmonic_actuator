import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { deformRadius, falloff, makeFlexMaterial } from './flexspline.ts';
import { gearParams } from './harmonicGears.ts';

const close = (actual: number, expected: number, epsilon = 1e-9): void => {
  assert.ok(
    Math.abs(actual - expected) < epsilon,
    `expected ${actual} to be within ${epsilon} of ${expected}`,
  );
};

const RIM_Z = 73;
const DIAPHRAGM_Z = 84;

test('falloff is 1 at the rim, 0 at the diaphragm, and monotonic between', () => {
  assert.equal(falloff(RIM_Z, RIM_Z, DIAPHRAGM_Z), 1);
  assert.equal(falloff(DIAPHRAGM_Z, RIM_Z, DIAPHRAGM_Z), 0);
  assert.ok(falloff(76, RIM_Z, DIAPHRAGM_Z) > falloff(80, RIM_Z, DIAPHRAGM_Z));
  assert.equal(falloff(60, RIM_Z, DIAPHRAGM_Z), 1);
});

test('deformRadius pushes the major axis out by one module and the minor in by one', () => {
  close(deformRadius(23.525, 0, RIM_Z, 0, 0.5, RIM_Z, DIAPHRAGM_Z), 24.025);
  close(
    deformRadius(23.525, Math.PI / 2, RIM_Z, 0, 0.5, RIM_Z, DIAPHRAGM_Z),
    23.025,
  );
});

test('the live shader uses the true module so the mates stay consistent', () => {
  const mesh = new THREE.Mesh(
    new THREE.BufferGeometry(),
    new THREE.MeshStandardMaterial(),
  );
  const material = makeFlexMaterial(mesh, gearParams(50));
  const uniforms = material.userData.flexUniforms as {
    uFlexModule: { value: number };
  };
  assert.equal(uniforms.uFlexModule.value, 0.5);
});

test('the deformation rotates with psi and vanishes at the diaphragm', () => {
  close(
    deformRadius(23.525, Math.PI / 2, RIM_Z, Math.PI / 2, 0.5, RIM_Z, DIAPHRAGM_Z),
    24.025,
  );
  close(
    deformRadius(23.525, 0.3, DIAPHRAGM_Z, 0, 0.5, RIM_Z, DIAPHRAGM_Z),
    23.525,
  );
});
