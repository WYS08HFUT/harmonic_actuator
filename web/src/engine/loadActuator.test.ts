import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { findNode, toGltfOffset } from './loadActuator.ts';

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
