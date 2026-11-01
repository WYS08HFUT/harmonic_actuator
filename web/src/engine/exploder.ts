import * as THREE from 'three';
import type { ActuatorPart } from './loadActuator.ts';

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export const explodeFactor = (
  progress: number,
  order: number,
  maxOrder: number,
  reducedMotion: boolean,
): number => {
  const value = reducedMotion ? (progress >= 0.5 ? 1 : 0) : clamp01(progress);
  const max = Math.max(1, maxOrder);
  const delay = (order / max) * 0.45;
  const local = clamp01((value - delay) / (1 - delay));
  return easeInOutCubic(local);
};

export class Exploder {
  private target = 0;
  private current = 0;
  private readonly maxOrder: number;

  constructor(
    private readonly parts: ActuatorPart[],
    maxOrder: number,
    private readonly reducedMotion = false,
  ) {
    this.maxOrder = Math.max(1, maxOrder);
  }

  setProgress(value: number): void {
    this.target = clamp01(value);
  }

  get progress(): number {
    return this.current;
  }

  get targetProgress(): number {
    return this.target;
  }

  update(dt: number): number {
    if (this.reducedMotion) {
      this.current = this.target;
    } else {
      this.current = THREE.MathUtils.damp(this.current, this.target, 6, dt);
      if (Math.abs(this.current - this.target) < 0.0002) this.current = this.target;
    }

    for (const part of this.parts) {
      const eased = explodeFactor(
        this.current,
        part.spec.explode_order,
        this.maxOrder,
        this.reducedMotion,
      );
      part.object.position.copy(part.basePosition).addScaledVector(part.offset, eased);
    }

    return this.current;
  }

  boundsAt(progress: number): THREE.Box3 {
    const bounds = new THREE.Box3();
    const value = clamp01(progress);

    for (const part of this.parts) {
      const eased = explodeFactor(
        value,
        part.spec.explode_order,
        this.maxOrder,
        this.reducedMotion,
      );
      // localBox is a world box; offsets live in the part's parent frame
      // (the CAD Z-up frame under the GLB's rotated actuator node), so the
      // offset must be rotated into world before translating the box.
      const parentQuaternion = part.object.parent
        ? part.object.parent.getWorldQuaternion(new THREE.Quaternion())
        : new THREE.Quaternion();
      const offset = part.offset
        .clone()
        .multiplyScalar(eased)
        .applyQuaternion(parentQuaternion);
      bounds.union(part.localBox.clone().translate(offset));
    }

    return bounds;
  }

  resetInstant(): void {
    this.target = 0;
    this.current = 0;
    for (const part of this.parts) part.object.position.copy(part.basePosition);
  }
}
