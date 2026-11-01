import type * as THREE from 'three';
import { updateFlexUniforms } from './flexspline.ts';

/** The transmission is shown at 1/20 real speed so the mesh stays readable. */
export const VISUAL_SCALE = 0.05;

export const outputRpm = (inputRpm: number, ratio: number): number =>
  ratio > 0 ? inputRpm / ratio : 0;

export interface DriveGroups {
  input: THREE.Object3D[];
  output: THREE.Object3D[];
  cage?: THREE.Object3D[];
  halfSpeed?: THREE.Object3D[];
  flexMaterials?: THREE.MeshStandardMaterial[];
}

export class Drive {
  inputAngle = 0;
  outputAngle = 0;
  waveAngle = 0;

  private inputRpm = 0;
  private ratio = 50;
  private groups: DriveGroups;

  constructor(groups: DriveGroups) {
    this.groups = {
      input: [...groups.input],
      output: [...groups.output],
      cage: [...(groups.cage ?? [])],
      halfSpeed: [...(groups.halfSpeed ?? [])],
      flexMaterials: [...(groups.flexMaterials ?? [])],
    };
    this.apply();
  }

  setInputRpm(rpm: number): void {
    this.inputRpm = Math.max(0, rpm);
  }

  setRatio(ratio: number): void {
    if (Number.isFinite(ratio) && ratio > 0) this.ratio = ratio;
  }

  setFlexMaterials(materials: THREE.MeshStandardMaterial[]): void {
    this.groups.flexMaterials = [...materials];
    this.applyFlex();
  }

  /** Swap the rotating objects after a procedural gear rebuild. */
  setGroups(groups: DriveGroups): void {
    this.groups = {
      input: [...groups.input],
      output: [...groups.output],
      cage: [...(groups.cage ?? [])],
      halfSpeed: [...(groups.halfSpeed ?? [])],
      flexMaterials: groups.flexMaterials ?? this.groups.flexMaterials,
    };
    this.apply();
  }

  update(dt: number): void {
    const waveDelta =
      (this.inputRpm / 60) * Math.PI * 2 * VISUAL_SCALE * Math.max(0, dt);
    this.waveAngle += waveDelta;
    this.inputAngle = this.waveAngle;
    this.outputAngle -= waveDelta / this.ratio;
    this.apply();
  }

  private apply(): void {
    for (const object of this.groups.input) object.rotation.z = this.waveAngle;
    for (const object of this.groups.output) object.rotation.z = this.outputAngle;
    for (const object of this.groups.cage ?? []) object.rotation.z = this.outputAngle / 2;
    for (const object of this.groups.halfSpeed ?? []) object.rotation.z = this.waveAngle / 2;
    this.applyFlex();
  }

  private applyFlex(): void {
    if (!this.groups.flexMaterials?.length) return;
    const psi = this.waveAngle - this.outputAngle;
    for (const material of this.groups.flexMaterials) {
      updateFlexUniforms(material, psi);
    }
  }
}
