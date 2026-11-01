export type RotationGroup = 'static' | 'input' | 'output' | 'half_speed';
export type ChildRotationGroup = Exclude<RotationGroup, 'static'>;

export interface PartSpec {
  node: string;
  group: RotationGroup;
  explode_offset: [number, number, number];
  explode_order: number;
  cut?: boolean;
  ghost_in_transmission?: boolean;
  teaching: string;
  procedural?: boolean;
  child_groups?: Record<string, ChildRotationGroup>;
}

export interface ActuatorManifest {
  id: string;
  title: string;
  units: 'mm';
  axis: 'Z';
  gltf_up: 'Y';
  gltf_units: 'mm';
  parts: PartSpec[];
  ratio: { min: number; max: number; step: number; default: number };
  input_speed: { min: number; max: number; default: number; visual_scale: number };
}
