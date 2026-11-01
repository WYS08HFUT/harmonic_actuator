import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { parseManifest } from './manifest.ts';
import type {
  ActuatorManifest,
  ChildRotationGroup,
  PartSpec,
} from './types.ts';

export interface ActuatorPart {
  index: number;
  spec: PartSpec;
  object: THREE.Object3D;
  meshes: THREE.Mesh[];
  allMaterials: THREE.Material[];
  standardMaterials: THREE.MeshStandardMaterial[];
  basePosition: THREE.Vector3;
  baseQuaternion: THREE.Quaternion;
  offset: THREE.Vector3;
  localBox: THREE.Box3;
}

export interface ChildGroup {
  object: THREE.Object3D;
  group: ChildRotationGroup;
}

export interface LoadedActuator {
  root: THREE.Group;
  manifest: ActuatorManifest;
  parts: ActuatorPart[];
  pickMeshes: THREE.Mesh[];
  bounds: THREE.Box3;
  maxOrder: number;
  proceduralNodes: string[];
  childGroups: ChildGroup[];
}

const normalizeZero = (value: number): number => (value === 0 ? 0 : value);

export const toGltfOffset = ([x, y, z]: [number, number, number]): THREE.Vector3 =>
  new THREE.Vector3(normalizeZero(x), normalizeZero(z), normalizeZero(-y));

export const toGltfAxis = (axis: [number, number, number]): THREE.Vector3 =>
  toGltfOffset(axis).normalize();

export const findNode = (root: THREE.Object3D, name: string): THREE.Object3D | null => {
  let found: THREE.Object3D | null = null;
  root.traverse((object) => {
    if (!found && object.name === name) found = object;
  });
  return found;
};

const materialsOf = (mesh: THREE.Mesh): THREE.Material[] =>
  Array.isArray(mesh.material) ? mesh.material : [mesh.material];

const applyMaterials = (mesh: THREE.Mesh, materials: THREE.Material[]): void => {
  mesh.material = Array.isArray(mesh.material) ? materials : materials[0];
};

export async function loadActuator(
  glbUrl: string,
  manifestUrl: string,
  onProgress?: (fraction: number) => void,
): Promise<LoadedActuator> {
  const [root, manifest] = await Promise.all([
    new Promise<THREE.Group>((resolve, reject) => {
      new GLTFLoader().load(
        glbUrl,
        (gltf) => resolve(gltf.scene as THREE.Group),
        (event) => {
          if (event.total > 0) onProgress?.(Math.min(1, event.loaded / event.total));
        },
        reject,
      );
    }),
    fetch(manifestUrl).then(async (response) => {
      if (!response.ok) throw new Error(`Manifest ${response.status}: ${manifestUrl}`);
      return parseManifest(await response.json());
    }),
  ]);

  root.updateMatrixWorld(true);

  const byName = new Map<string, THREE.Object3D>();
  root.traverse((object) => {
    if (object.name) byName.set(object.name, object);
  });

  const parts: ActuatorPart[] = [];
  const pickMeshes: THREE.Mesh[] = [];
  const partMaterials: THREE.Material[] = [];
  const proceduralNodes: string[] = [];
  const childGroups: ChildGroup[] = [];

  for (const spec of manifest.parts) {
    const object = byName.get(spec.node);
    if (!object) {
      console.warn(`[ha-110] Missing node: ${spec.node}`);
      continue;
    }

    const meshes: THREE.Mesh[] = [];
    const allMaterials: THREE.Material[] = [];
    const standardMaterials: THREE.MeshStandardMaterial[] = [];

    object.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      meshes.push(child);
      pickMeshes.push(child);

      const clones = materialsOf(child).map((material) => material.clone());
      applyMaterials(child, clones);

      const polymer = /PCB|Magnets|Sleeve|Encoder_Ring/.test(spec.node);
      for (const clone of clones) {
        clone.clippingPlanes = null;
        if (clone instanceof THREE.MeshStandardMaterial) {
          clone.emissive = new THREE.Color(0xc2652a);
          clone.emissiveIntensity = 0;
          clone.envMapIntensity = 1.0;
          clone.metalness = polymer ? 0.08 : 0.55;
          clone.roughness = polymer ? 0.58 : 0.34;
          standardMaterials.push(clone);
        }
        allMaterials.push(clone);
        partMaterials.push(clone);
      }
    });

    const part: ActuatorPart = {
      index: parts.length,
      spec,
      object,
      meshes,
      allMaterials,
      standardMaterials,
      basePosition: object.position.clone(),
      baseQuaternion: object.quaternion.clone(),
      offset: toGltfOffset(spec.explode_offset),
      localBox: new THREE.Box3().setFromObject(object),
    };

    object.userData.part = part;
    for (const mesh of meshes) mesh.userData.part = part;
    parts.push(part);

    if (spec.procedural) {
      object.visible = false;
      proceduralNodes.push(spec.node);
    }

    if (spec.child_groups) {
      for (const [childName, group] of Object.entries(spec.child_groups)) {
        const childObject = byName.get(childName);
        if (childObject) childGroups.push({ object: childObject, group });
        else console.warn(`[ha-110] Missing child node: ${childName}`);
      }
    }
  }

  const bounds = new THREE.Box3();
  for (const part of parts) bounds.expandByObject(part.object);
  const maxOrder = Math.max(0, ...manifest.parts.map((part) => part.explode_order));

  return {
    root,
    manifest,
    parts,
    pickMeshes,
    bounds,
    maxOrder,
    proceduralNodes,
    childGroups,
  };
}
