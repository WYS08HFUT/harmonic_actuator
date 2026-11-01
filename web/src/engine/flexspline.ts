import * as THREE from 'three';
import { GEAR_STATIONS } from './harmonicGears.ts';
import type { GearParams } from './harmonicGears.ts';

/**
 * The real radial strain is only ~2% of the radius, which is invisible at
 * screen scale. The live view amplifies it for teaching; the caption says so.
 */
export const FLEX_VISUAL_GAIN = 2.5;

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

/**
 * Stiffness falloff along the flexspline cup wall: 1 at the toothed rim,
 * 0 at the diaphragm, smooth in between. The rim is the lower Z station.
 */
export function falloff(z: number, rimZ: number, diaphragmZ: number): number {
  const t = clamp01((z - rimZ) / (diaphragmZ - rimZ));
  return 1 - t * t * (3 - 2 * t);
}

/**
 * Radius of the deployed flexspline at `theta`: the wave generator pushes the
 * major axis out by one module and pulls the minor axis in by one.
 */
export function deformRadius(
  r: number,
  theta: number,
  z: number,
  psi: number,
  module: number,
  rimZ: number,
  diaphragmZ: number,
): number {
  return r + module * falloff(z, rimZ, diaphragmZ) * Math.cos(2 * (theta - psi));
}

export interface FlexUniforms {
  uFlexPsi: { value: number };
  uFlexModule: { value: number };
  uFlexRimZ: { value: number };
  uFlexDiaphragmZ: { value: number };
}

/**
 * Inject the elliptical displacement into a standard material so the
 * flexspline keeps the scene's lighting, environment map and shadows.
 * The mesh must sit in the CAD Z-up frame (gear set local frame).
 */
export function makeFlexMaterial(
  flex: THREE.Mesh,
  params: GearParams,
): THREE.MeshStandardMaterial {
  const source = Array.isArray(flex.material) ? flex.material[0] : flex.material;
  if (!(source instanceof THREE.MeshStandardMaterial)) {
    throw new Error('Flexspline requires a MeshStandardMaterial');
  }

  const uniforms: FlexUniforms = {
    uFlexPsi: { value: 0 },
    uFlexModule: { value: params.module * FLEX_VISUAL_GAIN },
    uFlexRimZ: { value: GEAR_STATIONS.fsTeeth[1] },
    uFlexDiaphragmZ: { value: GEAR_STATIONS.fsWall[1] },
  };

  source.userData.flexUniforms = uniforms;
  source.flatShading = true;
  source.onBeforeCompile = (shader) => {
    shader.uniforms.uFlexPsi = uniforms.uFlexPsi;
    shader.uniforms.uFlexModule = uniforms.uFlexModule;
    shader.uniforms.uFlexRimZ = uniforms.uFlexRimZ;
    shader.uniforms.uFlexDiaphragmZ = uniforms.uFlexDiaphragmZ;

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
uniform float uFlexPsi;
uniform float uFlexModule;
uniform float uFlexRimZ;
uniform float uFlexDiaphragmZ;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
float flexTheta = atan(position.y, position.x);
float flexF = 1.0 - smoothstep(uFlexRimZ, uFlexDiaphragmZ, position.z);
float flexDelta = uFlexModule * flexF * cos(2.0 * (flexTheta - uFlexPsi));
vec2 flexRadial = normalize(position.xy);
transformed.xy += flexRadial * flexDelta;`,
      );
  };
  source.customProgramCacheKey = () => 'ha-flexspline';
  source.needsUpdate = true;
  return source;
}

export function updateFlexUniforms(
  material: THREE.MeshStandardMaterial,
  psi: number,
): void {
  const uniforms = material.userData.flexUniforms as FlexUniforms | undefined;
  if (uniforms) uniforms.uFlexPsi.value = psi;
}
