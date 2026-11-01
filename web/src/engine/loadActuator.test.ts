import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Exploder } from './exploder.ts';
import { findNode, toGltfOffset, toModelOffset } from './loadActuator.ts';
import type { ActuatorPart } from './loadActuator.ts';

test('findNode returns a named descendant and null for a miss', () => {
  const root = new THREE.Group();
  const body = new THREE.Object3D();
  body.name = 'Body_Housing';
  const assembly = new THREE.Group();
  assembly.name = 'Assembly';
  assembly.add(body);
  root.add(assembly);
  assert.equal(findNode(root, 'Body_Housing'), body);
  assert.equal(findNode(root, 'Missing'), null);
});

test('toGltfOffset converts model Z-up to glTF Y-up', () => {
  const a = toGltfOffset([0, 0, -75]);
  assert.deepEqual([a.x, a.y, a.z], [0, -75, 0]);
  const b = toGltfOffset([1, 2, 3]);
  assert.deepEqual([b.x, b.y, b.z], [1, 3, -2]);
});

test('model-space explode offsets move a rotated GLB part along the actuator axis', () => {
  const root = new THREE.Group();
  root.rotation.x = -Math.PI / 2;
  const object = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2));
  root.add(object);
  root.updateMatrixWorld(true);

  const part = {
    index: 0,
    spec: {
      node: 'Test_Part',
      group: 'static',
      explode_offset: [0, 0, -75],
      explode_order: 0,
      teaching: 'body',
    },
    object,
    meshes: [object],
    allMaterials: [],
    standardMaterials: [],
    basePosition: object.position.clone(),
    baseQuaternion: object.quaternion.clone(),
    offset: toModelOffset([0, 0, -75]),
    localBox: new THREE.Box3().setFromObject(object),
  } as unknown as ActuatorPart;

  const exploder = new Exploder([part], 0, true);
  exploder.setProgress(1);
  exploder.update(0.016);

  const world = object.getWorldPosition(new THREE.Vector3());
  assert.ok(Math.abs(world.y + 75) < 1e-9, `expected axial world y=-75, got ${world.y}`);
  assert.ok(Math.abs(world.z) < 1e-9, `expected no depth drift, got z=${world.z}`);

  const bounds = exploder.boundsAt(1);
  assert.ok(Math.abs(bounds.min.y + 76) < 1e-9, `expected bounds min y=-76, got ${bounds.min.y}`);
  assert.ok(Math.abs(bounds.min.z + 1) < 1e-9, `expected no depth bounds drift, got ${bounds.min.z}`);
});

test('group bounds are finite', () => {
  const root = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(10, 20, 30));
  mesh.position.set(1, 2, 3);
  root.add(mesh);
  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(root);
  assert.ok(Number.isFinite(bounds.min.x) && Number.isFinite(bounds.max.y));
  assert.ok(bounds.max.y > bounds.min.y);
});
