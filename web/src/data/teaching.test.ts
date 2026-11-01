import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseManifest } from '../engine/manifest.ts';
import { PILLAR_META, TEACHING } from './teaching.ts';

const raw = readFileSync(
  new URL('../../public/assets/harmonic_actuator.json', import.meta.url),
  'utf8',
);
const manifest = parseManifest(JSON.parse(raw));
const manifestKeys = new Set(manifest.parts.map((part) => part.teaching));

test('teaching covers every manifest teaching key', () => {
  assert.deepEqual(new Set(Object.keys(TEACHING)), manifestKeys);
});

test('every teaching card respects the copy limits', () => {
  for (const [key, note] of Object.entries(TEACHING)) {
    assert.ok(note.title.trim().length > 0, `${key}.title`);
    assert.ok(note.what.trim().length > 0, `${key}.what`);
    assert.ok(note.why.trim().length > 0, `${key}.why`);
    assert.ok(note.hint.trim().length > 0, `${key}.hint`);
    assert.ok(note.what.length <= 40, `${key}.what is ${note.what.length}`);
    assert.ok(note.why.length <= 60, `${key}.why is ${note.why.length}`);
    assert.ok(note.hint.length <= 40, `${key}.hint is ${note.hint.length}`);
    assert.ok(['space', 'drive', 'control'].includes(note.pillar), `${key}.pillar`);
  }
});

test('pillar metadata is complete', () => {
  assert.deepEqual(Object.keys(PILLAR_META).sort(), ['control', 'drive', 'space']);
  for (const meta of Object.values(PILLAR_META)) {
    assert.ok(meta.label.length > 0);
    assert.match(meta.color, /^#[0-9a-f]{6}$/i);
  }
});
