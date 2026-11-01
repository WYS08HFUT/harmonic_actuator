import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseManifest } from './manifest.ts';

const valid = {
  id: 'ha-110',
  title: '谐波关节模组 HA-110',
  units: 'mm',
  axis: 'Z',
  gltf_up: 'Y',
  gltf_units: 'mm',
  parts: [
    {
      node: 'Body_Housing',
      group: 'static',
      explode_offset: [0, 0, -40],
      explode_order: 0,
      teaching: 'body',
    },
  ],
  ratio: { min: 20, max: 100, step: 0.5, default: 50 },
  input_speed: { min: 0, max: 3000, default: 1000, visual_scale: 0.05 },
} as const;

test('parses a valid manifest', () => {
  const manifest = parseManifest(valid);
  assert.equal(manifest.parts[0].node, 'Body_Housing');
  assert.equal(manifest.parts[0].group, 'static');
  assert.equal(manifest.gltf_up, 'Y');
});

test('rejects a manifest without parts', () => {
  const { parts: _parts, ...rest } = valid;
  assert.throws(() => parseManifest(rest), /parts/);
});

test('rejects a non-positive ratio step', () => {
  const bad = { ...valid, ratio: { ...valid.ratio, step: 0 } };
  assert.throws(() => parseManifest(bad), /ratio/);
});

test('rejects an unknown rotation group', () => {
  const bad = { ...valid, parts: [{ ...valid.parts[0], group: 'spin' }] };
  assert.throws(() => parseManifest(bad), /group/);
});

test('rejects duplicate node names', () => {
  const bad = { ...valid, parts: [valid.parts[0], { ...valid.parts[0], explode_order: 1 }] };
  assert.throws(() => parseManifest(bad), /duplicate/);
});

test('rejects an explode_offset that is not a 3-vector', () => {
  const bad = { ...valid, parts: [{ ...valid.parts[0], explode_offset: [0, 0] }] };
  assert.throws(() => parseManifest(bad), /explode_offset/);
});

test('rejects missing GLB frame metadata', () => {
  const { gltf_up: _up, ...rest } = valid;
  assert.throws(() => parseManifest(rest), /gltf_up/);
});

test('rejects an unknown child_groups rotation', () => {
  const bad = {
    ...valid,
    parts: [{ ...valid.parts[0], child_groups: { Body_Housing: 'spin' } }],
  };
  assert.throws(() => parseManifest(bad), /child_groups/);
});

test('parses the exported 24-part manifest', () => {
  const raw = readFileSync(
    new URL('../../public/assets/harmonic_actuator.json', import.meta.url),
    'utf8',
  );
  const manifest = parseManifest(JSON.parse(raw));
  assert.equal(manifest.parts.length, 24);
  const rear = manifest.parts.find((part) => part.node === 'Rear_Cover');
  assert.equal(rear?.cut, true);
  const bearing = manifest.parts.find((part) => part.node === 'Rear_Bearing_6806');
  assert.deepEqual(bearing?.child_groups, {
    Rear_Bearing_Inner: 'input',
    Rear_Bearing_Balls: 'half_speed',
  });
});
