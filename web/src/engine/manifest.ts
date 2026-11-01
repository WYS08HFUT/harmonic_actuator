import type {
  ActuatorManifest,
  ChildRotationGroup,
  PartSpec,
  RotationGroup,
} from './types.ts';

type UnknownRecord = Record<string, unknown>;

const GROUPS: readonly RotationGroup[] = ['static', 'input', 'output', 'half_speed'];
const CHILD_GROUPS: readonly ChildRotationGroup[] = ['input', 'output', 'half_speed'];

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const fail = (field: string, detail = 'is invalid'): never => {
  throw new Error(`Manifest field "${field}" ${detail}`);
};

const str = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || value.length === 0) throw fail(field, 'must be a non-empty string');
  return value;
};

const num = (value: unknown, field: string): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw fail(field, 'must be a finite number');
  return value;
};

const bool = (value: unknown, field: string): boolean => {
  if (typeof value !== 'boolean') throw fail(field, 'must be a boolean');
  return value;
};

const parsePart = (value: unknown, index: number): PartSpec => {
  const field = `parts[${index}]`;
  if (!isRecord(value)) throw fail(field, 'must be an object');
  const node = str(value.node, `${field}.node`);
  const group = value.group;
  if (typeof group !== 'string' || !GROUPS.includes(group as RotationGroup)) {
    fail(`${field}.group`, 'must be static, input, output or half_speed');
  }
  const offset = value.explode_offset;
  if (!Array.isArray(offset) || offset.length !== 3) {
    throw fail(`${field}.explode_offset`, 'must be a 3-vector');
  }
  const explode_offset = offset.map((entry, axis) =>
    num(entry, `${field}.explode_offset[${axis}]`),
  ) as [number, number, number];
  const explode_order = num(value.explode_order, `${field}.explode_order`);
  if (!Number.isInteger(explode_order) || explode_order < 0) {
    fail(`${field}.explode_order`, 'must be a non-negative integer');
  }
  const teaching = str(value.teaching, `${field}.teaching`);

  let child_groups: Record<string, ChildRotationGroup> | undefined;
  if (value.child_groups !== undefined) {
    if (!isRecord(value.child_groups)) throw fail(`${field}.child_groups`, 'must be an object');
    child_groups = {};
    for (const [child, childGroup] of Object.entries(value.child_groups)) {
      if (
        typeof childGroup !== 'string' ||
        !CHILD_GROUPS.includes(childGroup as ChildRotationGroup)
      ) {
        fail(
          `${field}.child_groups`,
          'values must be input, output or half_speed',
        );
      }
      child_groups[child] = childGroup as ChildRotationGroup;
    }
  }

  return {
    node,
    group: group as RotationGroup,
    explode_offset,
    explode_order,
    teaching,
    cut: value.cut === undefined ? undefined : bool(value.cut, `${field}.cut`),
    ghost_in_transmission:
      value.ghost_in_transmission === undefined
        ? undefined
        : bool(value.ghost_in_transmission, `${field}.ghost_in_transmission`),
    procedural:
      value.procedural === undefined ? undefined : bool(value.procedural, `${field}.procedural`),
    child_groups,
  };
};

export const parseManifest = (data: unknown): ActuatorManifest => {
  if (!isRecord(data)) throw fail('manifest', 'must be an object');
  const root = data as UnknownRecord;
  const id = str(root.id, 'id');
  const title = str(root.title, 'title');
  const units = str(root.units, 'units');
  if (units !== 'mm') fail('units', 'must be "mm"');
  const axis = str(root.axis, 'axis');
  if (axis !== 'Z') fail('axis', 'must be "Z"');
  const gltf_up = str(root.gltf_up, 'gltf_up');
  if (gltf_up !== 'Y') fail('gltf_up', 'must be "Y"');
  const gltf_units = str(root.gltf_units, 'gltf_units');
  if (gltf_units !== 'mm') fail('gltf_units', 'must be "mm"');

  if (!Array.isArray(root.parts) || root.parts.length === 0) {
    throw fail('parts', 'must be a non-empty array');
  }
  const partsRaw = root.parts as unknown[];
  const parts = partsRaw.map((part, index) => parsePart(part, index));
  const seen = new Set<string>();
  for (const part of parts) {
    if (seen.has(part.node)) fail(`duplicate node "${part.node}"`);
    seen.add(part.node);
  }

  const ratioRaw = root.ratio;
  if (!isRecord(ratioRaw)) throw fail('ratio', 'must be an object');
  const ratio = {
    min: num(ratioRaw.min, 'ratio.min'),
    max: num(ratioRaw.max, 'ratio.max'),
    step: num(ratioRaw.step, 'ratio.step'),
    default: num(ratioRaw.default, 'ratio.default'),
  };
  if (!(ratio.step > 0)) fail('ratio.step', 'must be positive');
  if (!(ratio.min < ratio.max)) fail('ratio', 'min must be less than max');
  if (ratio.default < ratio.min || ratio.default > ratio.max) {
    fail('ratio.default', 'must be within min/max');
  }

  const inputSpeedRaw = root.input_speed;
  if (!isRecord(inputSpeedRaw)) throw fail('input_speed', 'must be an object');
  const input_speed = {
    min: num(inputSpeedRaw.min, 'input_speed.min'),
    max: num(inputSpeedRaw.max, 'input_speed.max'),
    default: num(inputSpeedRaw.default, 'input_speed.default'),
    visual_scale: num(inputSpeedRaw.visual_scale, 'input_speed.visual_scale'),
  };
  if (!(input_speed.min < input_speed.max)) {
    fail('input_speed', 'min must be less than max');
  }
  if (input_speed.default < input_speed.min || input_speed.default > input_speed.max) {
    fail('input_speed.default', 'must be within min/max');
  }
  if (!(input_speed.visual_scale > 0)) {
    fail('input_speed.visual_scale', 'must be positive');
  }

  return {
    id,
    title,
    units: 'mm',
    axis: 'Z',
    gltf_up: 'Y',
    gltf_units: 'mm',
    parts,
    ratio,
    input_speed,
  };
};
