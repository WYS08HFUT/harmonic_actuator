import * as THREE from 'three';

export interface GearParams {
  ratio: number;
  zf: number;
  zc: number;
  module: number;
  fsPitchRadius: number;
  fsTipRadius: number;
  fsRootRadius: number;
  fsInnerRadius: number;
  csPitchRadius: number;
  csTipRadius: number;
  csRootRadius: number;
  wgMajorRadius: number;
  wgMinorRadius: number;
}

export interface GearColors {
  flexspline: string;
  circularSpline: string;
  cam: string;
  race: string;
  balls: string;
}

export const GEAR_COLORS: GearColors = {
  flexspline: '#AEB9C8',
  circularSpline: '#6E7681',
  cam: '#C08A3E',
  race: '#DCE1E8',
  balls: '#DCE1E8',
};

/** Z-up stations (mm) copied from the CAD assembly. */
export const GEAR_STATIONS = {
  cs: [60, 74] as const,
  fsTeeth: [61, 73] as const,
  fsWall: [73, 84] as const,
  fsDiaphragm: [82, 87] as const,
  wg: [61, 73] as const,
};

const PRESSURE_ANGLE = (20 * Math.PI) / 180;
const RATIO_MIN = 20;
const RATIO_MAX = 100;
const PITCH_RADIUS = 25;
const FS_WALL = 0.85;
const WG_RACE_WALL = 1.0;
const WG_BALL_DIAMETER = 2.5;
const WG_BALL_COUNT = 18;
const FS_HUB_BORE_RADIUS = 16;

export function snapRatio(value: number): number {
  if (!Number.isFinite(value)) return 50;
  const clamped = Math.min(RATIO_MAX, Math.max(RATIO_MIN, value));
  return Math.round(clamped * 2) / 2;
}

export function gearParams(ratio: number): GearParams {
  if (!Number.isFinite(ratio) || ratio < RATIO_MIN || ratio > RATIO_MAX) {
    throw new Error(`Harmonic ratio out of range: ${ratio} (expected ${RATIO_MIN}-${RATIO_MAX})`);
  }
  const params: GearParams = {
    ratio,
    zf: Math.round(2 * ratio),
    zc: Math.round(2 * ratio) + 2,
    module: PITCH_RADIUS / ratio,
    fsPitchRadius: PITCH_RADIUS,
    fsTipRadius: 0,
    fsRootRadius: 0,
    fsInnerRadius: 0,
    csPitchRadius: 0,
    csTipRadius: 0,
    csRootRadius: 0,
    wgMajorRadius: 0,
    wgMinorRadius: 0,
  };
  params.fsTipRadius = params.fsPitchRadius + params.module;
  params.fsRootRadius = params.fsPitchRadius - 1.25 * params.module;
  params.fsInnerRadius = params.fsRootRadius - FS_WALL;
  params.csPitchRadius = params.fsPitchRadius + params.module;
  params.csTipRadius = params.csPitchRadius - params.module;
  params.csRootRadius = params.csPitchRadius + 1.25 * params.module;
  params.wgMajorRadius = params.fsInnerRadius + params.module;
  params.wgMinorRadius = params.fsInnerRadius - params.module;
  return params;
}

interface ProfilePoint {
  angle: number;
  radius: number;
}

const toothThicknessAtPitch = (p: GearParams): number =>
  (Math.PI * p.module) / 2 - 0.06 * p.module;

/** External-tooth angular half-width at a radius: narrower toward the tip. */
export function externalToothHalfAngle(p: GearParams, radius: number): number {
  const halfArc =
    toothThicknessAtPitch(p) / 2 -
    (radius - p.fsPitchRadius) * Math.tan(PRESSURE_ANGLE);
  return halfArc / radius;
}

/** Internal-tooth angular half-width at a radius: wider toward the inward tip. */
export function internalToothHalfAngle(p: GearParams, radius: number): number {
  const halfArc =
    toothThicknessAtPitch(p) / 2 +
    (p.csPitchRadius - radius) * Math.tan(PRESSURE_ANGLE);
  return halfArc / radius;
}

/**
 * Flexspline external teeth, tooth 0 centred on psi=0.
 * Flat tip/root, 20 degree flanks, half-pitch backlash.
 */
function externalToothProfile(p: GearParams): ProfilePoint[] {
  const pitchAngle = (Math.PI * 2) / p.zf;
  const points: ProfilePoint[] = [];

  for (let i = 0; i < p.zf; i += 1) {
    const center = i * pitchAngle;
    const tipHalf = externalToothHalfAngle(p, p.fsTipRadius);
    const rootHalf = externalToothHalfAngle(p, p.fsRootRadius);

    points.push({ angle: center - rootHalf, radius: p.fsRootRadius });
    points.push({ angle: center - tipHalf, radius: p.fsTipRadius });
    points.push({ angle: center + tipHalf, radius: p.fsTipRadius });
    points.push({ angle: center + rootHalf, radius: p.fsRootRadius });

    const gapStart = center + rootHalf;
    const gapEnd = center + pitchAngle - rootHalf;
    if (gapEnd > gapStart) {
      points.push({ angle: (gapStart + gapEnd) / 2, radius: p.fsRootRadius });
    }
  }
  return points;
}

/**
 * Circular spline internal teeth, tooth centres offset by half a pitch so
 * psi=0 carries a tooth space opposite flexspline tooth 0.
 */
function internalToothProfile(p: GearParams): ProfilePoint[] {
  const pitchAngle = (Math.PI * 2) / p.zc;
  const points: ProfilePoint[] = [];

  for (let i = 0; i < p.zc; i += 1) {
    const center = (i + 0.5) * pitchAngle;
    const tipHalf = internalToothHalfAngle(p, p.csTipRadius);
    const rootHalf = internalToothHalfAngle(p, p.csRootRadius);

    points.push({ angle: center - rootHalf, radius: p.csRootRadius });
    points.push({ angle: center - tipHalf, radius: p.csTipRadius });
    points.push({ angle: center + tipHalf, radius: p.csTipRadius });
    points.push({ angle: center + rootHalf, radius: p.csRootRadius });

    const gapStart = center + rootHalf;
    const gapEnd = center + pitchAngle - rootHalf;
    if (gapEnd > gapStart) {
      points.push({ angle: (gapStart + gapEnd) / 2, radius: p.csRootRadius });
    }
  }
  return points;
}

const metalMaterial = (color: string, options: { flat?: boolean } = {}): THREE.MeshStandardMaterial =>
  new THREE.MeshStandardMaterial({
    color,
    metalness: 0.55,
    roughness: 0.34,
    flatShading: options.flat ?? false,
    side: THREE.DoubleSide,
  });

const addVertex = (positions: number[], angle: number, radius: number, z: number): void => {
  positions.push(Math.cos(angle) * radius, Math.sin(angle) * radius, z);
};

/** Closed toothed annulus between the sampled working profile and a constant circle. */
function toothedRing(
  profile: ProfilePoint[],
  otherRadius: number,
  z0: number,
  z1: number,
  material: THREE.Material,
): THREE.Mesh {
  const positions: number[] = [];
  const indices: number[] = [];
  const count = profile.length;

  const workingTop: number[] = [];
  const workingBottom: number[] = [];
  const otherTop: number[] = [];
  const otherBottom: number[] = [];
  for (const point of profile) {
    workingTop.push(positions.length / 3);
    addVertex(positions, point.angle, point.radius, z1);
    workingBottom.push(positions.length / 3);
    addVertex(positions, point.angle, point.radius, z0);
    otherTop.push(positions.length / 3);
    addVertex(positions, point.angle, otherRadius, z1);
    otherBottom.push(positions.length / 3);
    addVertex(positions, point.angle, otherRadius, z0);
  }

  for (let i = 0; i < count; i += 1) {
    const j = (i + 1) % count;
    // Top and bottom annulus strips.
    indices.push(workingTop[i], workingTop[j], otherTop[j]);
    indices.push(workingTop[i], otherTop[j], otherTop[i]);
    indices.push(workingBottom[i], otherBottom[j], workingBottom[j]);
    indices.push(workingBottom[i], otherBottom[i], otherBottom[j]);
    // Working-profile wall and constant-circle wall.
    indices.push(workingBottom[i], workingBottom[j], workingTop[j]);
    indices.push(workingBottom[i], workingTop[j], workingTop[i]);
    indices.push(otherBottom[i], otherTop[j], otherBottom[j]);
    indices.push(otherBottom[i], otherTop[i], otherTop[j]);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** Closed annular extrusion along Z (used for cup wall and diaphragm). */
function annulus(
  outerRadius: number,
  innerRadius: number,
  z0: number,
  z1: number,
  material: THREE.Material,
  curveSegments = 128,
): THREE.Mesh {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, outerRadius, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absarc(0, 0, innerRadius, 0, Math.PI * 2, true);
  shape.holes.push(hole);

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: z1 - z0,
    bevelEnabled: false,
    curveSegments,
  });
  geometry.translate(0, 0, z0);

  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function buildFlexspline(p: GearParams): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Flexspline_Cup';

  // One shared material so the vertex-shader deformation moves the whole cup.
  const material = metalMaterial(GEAR_COLORS.flexspline, { flat: true });

  const teeth = toothedRing(
    externalToothProfile(p),
    p.fsInnerRadius,
    GEAR_STATIONS.fsTeeth[0],
    GEAR_STATIONS.fsTeeth[1],
    material,
  );
  teeth.name = 'Flexspline_Teeth';

  const wall = annulus(
    p.fsInnerRadius,
    p.fsInnerRadius - FS_WALL,
    GEAR_STATIONS.fsWall[0],
    GEAR_STATIONS.fsWall[1],
    material,
  );
  wall.name = 'Flexspline_Wall';

  const diaphragm = annulus(
    p.fsInnerRadius,
    FS_HUB_BORE_RADIUS,
    GEAR_STATIONS.fsDiaphragm[0],
    GEAR_STATIONS.fsDiaphragm[1],
    material,
  );
  diaphragm.name = 'Flexspline_Diaphragm';

  group.add(teeth, wall, diaphragm);
  return group;
}

function buildCircularSpline(p: GearParams): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Circular_Spline_Ring';

  const rimRadius = p.csRootRadius + Math.max(3, 6 * p.module);
  const ring = toothedRing(
    internalToothProfile(p),
    rimRadius,
    GEAR_STATIONS.cs[0],
    GEAR_STATIONS.cs[1],
    metalMaterial(GEAR_COLORS.circularSpline, { flat: true }),
  );
  ring.name = 'Circular_Spline_Teeth';
  group.add(ring);
  return group;
}

function buildCam(p: GearParams): THREE.Mesh {
  const raceInnerMajor = p.wgMajorRadius - WG_RACE_WALL;
  const raceInnerMinor = p.wgMinorRadius - WG_RACE_WALL;
  const ballMajor = raceInnerMajor - WG_BALL_DIAMETER / 2;
  const ballMinor = raceInnerMinor - WG_BALL_DIAMETER / 2;
  const camMajor = ballMajor - WG_BALL_DIAMETER / 2;
  const camMinor = ballMinor - WG_BALL_DIAMETER / 2;

  const shape = new THREE.Shape();
  shape.absellipse(0, 0, camMajor, camMinor, 0, Math.PI * 2, false, 0);
  const bore = new THREE.Path();
  bore.absarc(0, 0, 10, 0, Math.PI * 2, true);
  shape.holes.push(bore);
  for (let i = 0; i < 6; i += 1) {
    const angle = (i * Math.PI * 2) / 6;
    const hole = new THREE.Path();
    hole.absarc(Math.cos(angle) * 14, Math.sin(angle) * 14, 1.7, 0, Math.PI * 2, true);
    shape.holes.push(hole);
  }

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: GEAR_STATIONS.wg[1] - GEAR_STATIONS.wg[0],
    bevelEnabled: false,
    curveSegments: 128,
  });
  geometry.translate(0, 0, GEAR_STATIONS.wg[0]);

  const mesh = new THREE.Mesh(geometry, metalMaterial(GEAR_COLORS.cam));
  mesh.name = 'Wave_Generator_Cam';
  return mesh;
}

function buildRace(p: GearParams): THREE.Mesh {
  const shape = new THREE.Shape();
  shape.absellipse(0, 0, p.wgMajorRadius, p.wgMinorRadius, 0, Math.PI * 2, false, 0);
  const hole = new THREE.Path();
  hole.absellipse(
    0,
    0,
    p.wgMajorRadius - WG_RACE_WALL,
    p.wgMinorRadius - WG_RACE_WALL,
    0,
    Math.PI * 2,
    true,
  );
  shape.holes.push(hole);

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: GEAR_STATIONS.wg[1] - GEAR_STATIONS.wg[0],
    bevelEnabled: false,
    curveSegments: 160,
  });
  geometry.translate(0, 0, GEAR_STATIONS.wg[0]);

  const mesh = new THREE.Mesh(geometry, metalMaterial(GEAR_COLORS.race));
  mesh.name = 'Wave_Generator_Flexible_Race';
  return mesh;
}

function buildBalls(p: GearParams): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Wave_Generator_Balls';

  const major = p.wgMajorRadius - WG_RACE_WALL - WG_BALL_DIAMETER / 2;
  const minor = p.wgMinorRadius - WG_RACE_WALL - WG_BALL_DIAMETER / 2;
  const zMid = (GEAR_STATIONS.wg[0] + GEAR_STATIONS.wg[1]) / 2;
  const material = metalMaterial(GEAR_COLORS.balls);

  for (let i = 0; i < WG_BALL_COUNT; i += 1) {
    const angle = (i * Math.PI * 2) / WG_BALL_COUNT;
    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(WG_BALL_DIAMETER / 2, 16, 12),
      material,
    );
    ball.position.set(Math.cos(angle) * major, Math.sin(angle) * minor, zMid);
    ball.castShadow = true;
    group.add(ball);
  }
  return group;
}

export function buildGearSet(params: GearParams): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Harmonic_Gear_Set';
  group.add(
    buildFlexspline(params),
    buildCircularSpline(params),
    buildCam(params),
    buildBalls(params),
    buildRace(params),
  );
  return group;
}

export function disposeGearSet(group: THREE.Group): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();

  group.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    geometries.add(object.geometry);
    const meshMaterials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of meshMaterials) materials.add(material);
  });

  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
  group.removeFromParent();
}
