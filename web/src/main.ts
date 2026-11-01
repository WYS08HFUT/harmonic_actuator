import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { PILLAR_META, TEACHING } from './data/teaching.ts';
import { Drive, outputRpm } from './engine/drive.ts';
import type { DriveGroups } from './engine/drive.ts';
import { Exploder } from './engine/exploder.ts';
import { makeFlexMaterial } from './engine/flexspline.ts';
import { MeshDiagram } from './engine/meshDiagram.ts';
import {
  buildGearSet,
  disposeGearSet,
  gearParams,
  snapRatio,
} from './engine/harmonicGears.ts';
import { loadActuator, toModelOffset } from './engine/loadActuator.ts';
import type { ActuatorPart, LoadedActuator } from './engine/loadActuator.ts';
import './style.css';

const container = document.querySelector<HTMLDivElement>('#scene-container');
const loading = document.querySelector<HTMLDivElement>('#loading');
const loadingBar = document.querySelector<HTMLDivElement>('#loading-bar');
const loadingPercent = document.querySelector<HTMLSpanElement>('#loading-percent');
const errorPanel = document.querySelector<HTMLDivElement>('#error');
const errorMessage = document.querySelector<HTMLParagraphElement>('#error-message');
const explodeInput = document.querySelector<HTMLInputElement>('#explode');
const explodeValue = document.querySelector<HTMLOutputElement>('#explode-value');
const driveButton = document.querySelector<HTMLButtonElement>('#btn-drive');
const cutButton = document.querySelector<HTMLButtonElement>('#btn-cut');
const resetButton = document.querySelector<HTMLButtonElement>('#btn-reset');
const viewOverviewButton = document.querySelector<HTMLButtonElement>('#btn-view-overview');
const viewGearButton = document.querySelector<HTMLButtonElement>('#btn-view-gear');
const viewOutputButton = document.querySelector<HTMLButtonElement>('#btn-view-output');
const partCard = document.querySelector<HTMLElement>('#part-card');
const partSystem = document.querySelector<HTMLParagraphElement>('#part-system');
const partTitle = document.querySelector<HTMLHeadingElement>('#part-title');
const partWhat = document.querySelector<HTMLParagraphElement>('#part-what');
const partWhyWrap = document.querySelector<HTMLElement>('#part-why-wrap');
const partWhy = document.querySelector<HTMLParagraphElement>('#part-why');
const partHintWrap = document.querySelector<HTMLElement>('#part-hint-wrap');
const partHint = document.querySelector<HTMLParagraphElement>('#part-hint');
const partOrder = document.querySelector<HTMLParagraphElement>('#part-order');
const partClose = document.querySelector<HTMLButtonElement>('#part-close');
const partSelect = document.querySelector<HTMLSelectElement>('#part-select');
const hoverLabel = document.querySelector<HTMLDivElement>('#hover-label');
const hoverName = document.querySelector<HTMLSpanElement>('#hover-name');
const ratioInput = document.querySelector<HTMLInputElement>('#ratio');
const ratioValue = document.querySelector<HTMLOutputElement>('#ratio-value');
const driveControls = document.querySelector<HTMLDivElement>('#drive-controls');
const inputRpmInput = document.querySelector<HTMLInputElement>('#input-rpm');
const inputRpmValue = document.querySelector<HTMLOutputElement>('#input-rpm-value');
const outputRpmText = document.querySelector<HTMLElement>('#output-rpm');
const diagramButton = document.querySelector<HTMLButtonElement>('#btn-diagram');
const diagramPanel = document.querySelector<HTMLDivElement>('#diagram-panel');
const diagramClose = document.querySelector<HTMLButtonElement>('#diagram-close');
const diagramCanvas = document.querySelector<HTMLCanvasElement>('#diagram-canvas');
const diagramKicker = document.querySelector<HTMLParagraphElement>('#diagram-kicker');

if (
  !container ||
  !loading ||
  !loadingBar ||
  !loadingPercent ||
  !errorPanel ||
  !errorMessage ||
  !explodeInput ||
  !explodeValue ||
  !driveButton ||
  !cutButton ||
  !resetButton ||
  !viewOverviewButton ||
  !viewGearButton ||
  !viewOutputButton ||
  !partCard ||
  !partSystem ||
  !partTitle ||
  !partWhat ||
  !partWhyWrap ||
  !partWhy ||
  !partHintWrap ||
  !partHint ||
  !partOrder ||
  !partClose ||
  !partSelect ||
  !hoverLabel ||
  !hoverName ||
  !ratioInput ||
  !ratioValue ||
  !driveControls ||
  !inputRpmInput ||
  !inputRpmValue ||
  !outputRpmText ||
  !diagramButton ||
  !diagramPanel ||
  !diagramClose ||
  !diagramCanvas ||
  !diagramKicker
) {
  throw new Error('Page shell is missing required elements');
}

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const assetBase = import.meta.env.BASE_URL;

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setClearColor(0x000000, 0);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.06;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.localClippingEnabled = true;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
// Transparent canvas: the page CSS supplies the warm radial gradient.

const camera = new THREE.PerspectiveCamera(
  31,
  container.clientWidth / container.clientHeight,
  0.5,
  4000,
);
camera.position.set(180, 150, 230);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.enablePan = false;
controls.minPolarAngle = Math.PI * 0.08;
controls.maxPolarAngle = Math.PI * 0.88;
controls.target.set(0, 58, 0);
controls.autoRotate = !reduceMotion;
controls.autoRotateSpeed = 0.3;
controls.update();

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
pmrem.dispose();

scene.add(new THREE.HemisphereLight(0xfdfbf6, 0xcfc8bc, 0.55));

const key = new THREE.DirectionalLight(0xfff2e2, 3.2);
key.position.set(220, 320, 190);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.left = -220;
key.shadow.camera.right = 220;
key.shadow.camera.top = 220;
key.shadow.camera.bottom = -220;
key.shadow.camera.near = 20;
key.shadow.camera.far = 900;
key.shadow.bias = -0.0002;
scene.add(key);
scene.add(key.target);

const fill = new THREE.DirectionalLight(0xdfe9f2, 0.45);
fill.position.set(-240, 140, 130);
scene.add(fill);

const rim = new THREE.DirectionalLight(0xffd9bd, 0.5);
rim.position.set(-90, 240, -260);
scene.add(rim);

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(300, 96),
  new THREE.ShadowMaterial({ color: 0x2a241e, opacity: 0.1 }),
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
floor.position.y = -0.6;
scene.add(floor);

let loadedBounds: THREE.Box3 | null = null;
let exploder: Exploder | null = null;
let hasInteracted = false;
let autoFit = false;

let gearSet: THREE.Group | null = null;
let gearRatio = 50;
let flexMaterial: THREE.MeshStandardMaterial | null = null;
let drive: Drive | null = null;
let driveEnabled = false;
let drivePaused = false;
let transmissionGhosted = false;
let ratioTimer: number | null = null;
let meshDiagram: MeshDiagram | null = null;
let diagramOpen = false;

let actuator: LoadedActuator | null = null;
let selected: ActuatorPart | null = null;
let hovered: ActuatorPart | null = null;
let preFocusPosition: THREE.Vector3 | null = null;
let preFocusTarget: THREE.Vector3 | null = null;
let isDragging = false;
let pointerInside = false;
let pointerOverUI = false;
let pointerX = 0;
let pointerY = 0;

const pointer = new THREE.Vector2();
const raycaster = new THREE.Raycaster();

interface CameraMove {
  startPosition: THREE.Vector3;
  endPosition: THREE.Vector3;
  startTarget: THREE.Vector3;
  endTarget: THREE.Vector3;
  startTime: number;
  duration: number;
}

let cameraMove: CameraMove | null = null;

interface MaterialState {
  material: THREE.Material;
  transparent: boolean;
  opacity: number;
  depthWrite: boolean;
  side: THREE.Side;
}

let materialStates: MaterialState[] = [];

/**
 * Snapshot each material's resting state once. A ratio rebuild replaces only
 * the procedural materials, so existing (possibly ghosted) materials must
 * keep their original base state rather than re-snapshotting a ghost.
 */
const captureMaterialStates = (prune = false) => {
  if (!actuator) return;
  if (prune) {
    const live = new Set<THREE.Material>();
    for (const part of actuator.parts) {
      for (const material of part.allMaterials) live.add(material);
    }
    materialStates = materialStates.filter((state) => live.has(state.material));
  }

  const known = new Set(materialStates.map((state) => state.material));
  for (const part of actuator.parts) {
    for (const material of part.allMaterials) {
      if (known.has(material)) continue;
      known.add(material);
      materialStates.push({
        material,
        transparent: material.transparent,
        opacity: material.opacity,
        depthWrite: material.depthWrite,
        side: material.side,
      });
    }
  }
};

const stateByMaterial = () => new Map(materialStates.map((state) => [state.material, state]));

const GHOST_OPACITY = new Map([['Circular_Spline_Ring', 0.45]]);

const setPartGhost = (labels: Set<string>, on: boolean) => {
  if (!actuator) return;
  const states = stateByMaterial();
  for (const part of actuator.parts) {
    if (!labels.has(part.spec.node)) continue;
    const opacity = GHOST_OPACITY.get(part.spec.node) ?? 0.2;
    for (const material of part.allMaterials) {
      const state = states.get(material);
      if (!state) continue;
      material.transparent = on ? true : state.transparent;
      material.opacity = on ? opacity : state.opacity;
      material.depthWrite = on ? false : state.depthWrite;
      material.needsUpdate = true;
    }
  }
};

const EXPLODE_GHOST = new Set([
  'Body_Housing',
  'Rear_End_Bell',
  'Rear_Cover',
  'Output_Cap_Mount_Flange',
]);

// The circular spline ghosts lighter than the housing (GHOST_OPACITY 0.45)
// so the stationary teeth remain legible against the deformed flexspline.
const TRANSMISSION_GHOST = new Set([
  'Body_Housing',
  'Frameless_Stator_Core',
  'Copper_Stator_Windings',
  'Circular_Spline_Ring',
  'Output_Cap_Mount_Flange',
]);

const GEAR_GHOST = new Set([
  'Body_Housing',
  'Frameless_Stator_Core',
  'Copper_Stator_Windings',
  'Output_Cap_Mount_Flange',
  'Output_Flange',
]);

let gearGhosted = false;

const setHousingGhost = (on: boolean) => setPartGhost(EXPLODE_GHOST, on);
const setGhosted = (on: boolean) => {
  transmissionGhosted = on;
  setPartGhost(TRANSMISSION_GHOST, on);
};
const setGearGhost = (on: boolean) => {
  gearGhosted = on;
  setPartGhost(GEAR_GHOST, on);
};

let cutEnabled = false;
const cutPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);

// The global 180° cut exposes the motor, CRB and harmonic section. A true
// 90° wedge would need a custom clip shader; the gear camera preset frames
// the cut harmonic section instead, and the FS/WG are never clipped.
const setCutEnabled = (on: boolean) => {
  if (!actuator) return;
  cutEnabled = on;
  if (on && loadedBounds) {
    const center = loadedBounds.getCenter(new THREE.Vector3());
    cutPlane.constant = center.z;
  }
  const states = stateByMaterial();
  for (const part of actuator.parts) {
    const cut = on && part.spec.cut === true;
    for (const material of part.allMaterials) {
      const state = states.get(material);
      material.clippingPlanes = cut ? [cutPlane] : null;
      material.clipShadows = cut;
      if (state) material.side = cut ? THREE.DoubleSide : state.side;
      material.needsUpdate = true;
    }
  }
  cutButton.classList.toggle('is-active', on);
  cutButton.setAttribute('aria-pressed', String(on));
};

const setLoading = (fraction: number) => {
  const percent = Math.round(Math.max(0, Math.min(1, fraction)) * 100);
  loadingBar.style.width = `${percent}%`;
  loadingPercent.textContent = `${percent}%`;
};

const finishLoading = () => {
  setLoading(1);
  window.setTimeout(() => {
    loading.classList.add('is-done');
    window.setTimeout(() => {
      loading.style.display = 'none';
    }, 620);
  }, 240);
};

const showError = (error: unknown) => {
  console.error(error);
  loading.classList.add('is-done');
  errorPanel.hidden = false;
  errorMessage.textContent = error instanceof Error ? error.message : String(error);
};

renderer.domElement.addEventListener('webglcontextlost', (event) => {
  event.preventDefault();
  showError(new Error('WebGL 上下文丢失，请刷新页面重试。'));
});

interface Framing {
  position: THREE.Vector3;
  target: THREE.Vector3;
  distance: number;
}

const framingForBounds = (bounds: THREE.Box3, margin = 1.85): Framing => {
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const fov = THREE.MathUtils.degToRad(camera.fov);
  const fitHeight = size.y / 2 / Math.tan(fov / 2);
  const fitWidth = size.x / 2 / Math.tan(fov / 2) / camera.aspect;
  const distance = Math.max(fitHeight, fitWidth) * margin;
  const direction = new THREE.Vector3(0.92, 0.42, 1.08).normalize();
  const target = center.clone();
  target.y += size.y * 0.015;
  return {
    position: target.clone().addScaledVector(direction, distance),
    target,
    distance,
  };
};

const frameModel = (bounds: THREE.Box3) => {
  const framing = framingForBounds(bounds);
  camera.position.copy(framing.position);
  controls.target.copy(framing.target);
  controls.minDistance = framing.distance * 0.42;
  controls.maxDistance = framing.distance * 2.3;
  controls.update();

  key.target.position.copy(framing.target);
  key.target.updateMatrixWorld();
  floor.position.y = bounds.min.y - 0.6;
};

const updateAutoFit = (dt: number) => {
  if (!autoFit || !exploder) return;
  const framing = framingForBounds(exploder.boundsAt(exploder.progress), 1.5);
  const alpha = 1 - Math.exp(-4.5 * dt);
  camera.position.lerp(framing.position, alpha);
  controls.target.lerp(framing.target, alpha);
  controls.update();
  key.target.position.copy(framing.target);
  key.target.updateMatrixWorld();
};

const updateExplodeUI = (percent: number) => {
  const value = Math.max(0, Math.min(100, percent));
  explodeValue.textContent = `${Math.round(value)}%`;
  explodeInput.style.setProperty('--val', `${value}%`);
};


const setPartHighlight = (part: ActuatorPart, mode: 'none' | 'hover' | 'selected') => {
  const intensity = mode === 'selected' ? 0.12 : mode === 'hover' ? 0.05 : 0;
  for (const material of part.standardMaterials) material.emissiveIntensity = intensity;
};

const updateCard = (part: ActuatorPart) => {
  const note = TEACHING[part.spec.teaching];
  if (!note) return;
  const meta = PILLAR_META[note.pillar];
  partCard.dataset.pillar = note.pillar;
  partSystem.textContent = meta.label;
  partSystem.style.color = meta.color;
  partTitle.textContent = note.title;
  partWhat.textContent = note.what;
  partWhyWrap.hidden = false;
  partWhy.textContent = note.why;
  partHintWrap.hidden = false;
  partHint.textContent = note.hint;
  const maxOrder = actuator?.maxOrder ?? 0;
  partOrder.textContent = `分离顺序 ${String(part.spec.explode_order).padStart(2, '0')} / ${String(maxOrder).padStart(2, '0')}`;
};

const openCard = () => {
  partCard.classList.add('is-open');
  partCard.setAttribute('aria-hidden', 'false');
  partCard.removeAttribute('inert');
  document.body.classList.add('has-selection');
};

const closeCard = () => {
  partCard.classList.remove('is-open');
  partCard.setAttribute('aria-hidden', 'true');
  partCard.setAttribute('inert', '');
  document.body.classList.remove('has-selection');
};

const positionHoverLabel = () => {
  const x = Math.min(pointerX + 16, window.innerWidth - 220);
  const y = Math.min(pointerY + 16, window.innerHeight - 90);
  hoverLabel.style.transform = `translate3d(${x}px, ${y}px, 0)`;
};

const setHover = (part: ActuatorPart | null) => {
  if (hovered === part) return;
  if (hovered && hovered !== selected) setPartHighlight(hovered, 'none');
  hovered = part;
  if (!part) {
    hoverLabel.classList.remove('is-visible');
    renderer.domElement.style.cursor = '';
    return;
  }
  if (part !== selected) setPartHighlight(part, 'hover');
  const note = TEACHING[part.spec.teaching];
  hoverName.textContent = note?.title ?? part.spec.node;
  hoverLabel.classList.add('is-visible');
  positionHoverLabel();
  renderer.domElement.style.cursor = 'pointer';
};

const cancelCameraMove = () => {
  if (!cameraMove) return;
  cameraMove = null;
  controls.enabled = true;
};

const moveCamera = (position: THREE.Vector3, target: THREE.Vector3, duration = 760) => {
  autoFit = false;
  if (reduceMotion) {
    camera.position.copy(position);
    controls.target.copy(target);
    controls.update();
    return;
  }
  cameraMove = {
    startPosition: camera.position.clone(),
    endPosition: position.clone(),
    startTarget: controls.target.clone(),
    endTarget: target.clone(),
    startTime: performance.now(),
    duration,
  };
  controls.enabled = false;
  controls.autoRotate = false;
};

const updateCameraMove = (now: number) => {
  if (!cameraMove) return;
  const t = Math.min(1, (now - cameraMove.startTime) / cameraMove.duration);
  const eased = 1 - Math.pow(1 - t, 3);
  camera.position.lerpVectors(cameraMove.startPosition, cameraMove.endPosition, eased);
  controls.target.lerpVectors(cameraMove.startTarget, cameraMove.endTarget, eased);
  camera.lookAt(controls.target);
  if (t >= 1) {
    cameraMove = null;
    controls.enabled = true;
  }
};

const focusPart = (part: ActuatorPart) => {
  const box = new THREE.Box3().setFromObject(part.object);
  const direction = camera.position.clone().sub(controls.target);
  if (direction.lengthSq() < 1e-6) direction.set(0.92, 0.42, 1.08);
  direction.normalize();
  const framing = framingForBounds(box, 1.7);
  const target = framing.target.clone();
  const distance = Math.max(framing.distance, 80);
  const position = target.clone().addScaledVector(direction, distance);
  moveCamera(position, target, 760);
};

const selectPart = (part: ActuatorPart | null, restoreCamera = true) => {
  if (selected === part) return;

  if (selected) setPartHighlight(selected, 'none');
  selected = part;

  if (!part) {
    closeCard();
    if (restoreCamera && preFocusPosition && preFocusTarget) {
      moveCamera(preFocusPosition, preFocusTarget, 720);
    }
    preFocusPosition = null;
    preFocusTarget = null;
    if (hovered) setPartHighlight(hovered, 'hover');
    return;
  }

  if (!preFocusPosition || !preFocusTarget) {
    preFocusPosition = camera.position.clone();
    preFocusTarget = controls.target.clone();
  }

  setPartHighlight(part, 'selected');
  updateCard(part);
  openCard();
  autoFit = false;
  controls.autoRotate = false;
  focusPart(part);
};

const pickPart = (clientX: number, clientY: number): ActuatorPart | null => {
  if (!actuator) return null;
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.set(
    ((clientX - rect.left) / rect.width) * 2 - 1,
    -((clientY - rect.top) / rect.height) * 2 + 1,
  );
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(actuator.pickMeshes, false)[0];
  return (hit?.object.userData.part as ActuatorPart | undefined) ?? null;
};


const boundsOfParts = (nodes: string[]): THREE.Box3 | null => {
  if (!actuator) return null;
  const box = new THREE.Box3();
  let found = false;
  for (const node of nodes) {
    const part = actuator.parts.find((item) => item.spec.node === node);
    if (!part) continue;
    box.expandByObject(part.object);
    found = true;
  }
  return found ? box : null;
};

const resetCamera = () => {
  selectPart(null, false);
  exploder?.setProgress(0);
  explodeInput.value = '0';
  updateExplodeUI(0);
  autoFit = false;
  hasInteracted = false;
  controls.autoRotate = !reduceMotion;
  driveButton.disabled = false;
  cutButton.disabled = false;
  document.body.classList.remove('is-exploding');
  drivePaused = false;
  setHousingGhost(false);
  setGhosted(false);
  setGearGhost(false);
  if (driveEnabled) setGhosted(true);
  setCutEnabled(false);
  if (loadedBounds) frameModel(loadedBounds);
};

const focusGearView = () => {
  const box = boundsOfParts([
    'Flexspline_Cup',
    'Circular_Spline_Ring',
    'Wave_Generator_Cam',
    'Wave_Generator_Balls',
    'Wave_Generator_Flexible_Race',
  ]);
  if (!box) return;
  selectPart(null, false);
  setCutEnabled(true);
  setGhosted(false);
  setGearGhost(true);
  hasInteracted = true;
  autoFit = false;
  controls.autoRotate = false;
  // Frame the tooth band (Z 60-74) rather than the whole cup, so the mesh
  // fills the view while the ghosted housing stays out of the way.
  box.min.y = 58;
  box.max.y = 78;
  const direction = new THREE.Vector3(0.45, 0.18, 1.0).normalize();
  const framing = framingForBounds(box, 1.4);
  const target = framing.target.clone();
  moveCamera(target.clone().addScaledVector(direction, framing.distance), target, 780);
};

const focusOutputView = () => {
  const box = boundsOfParts([
    'Output_Flange',
    'Cross_Roller_Bearing_Assembly',
    'Output_Cap_Mount_Flange',
    'Output_Encoder_Ring',
    'Output_Encoder_PCB',
  ]);
  if (!box) return;
  selectPart(null, false);
  setCutEnabled(true);
  setGhosted(false);
  setGearGhost(false);
  hasInteracted = true;
  autoFit = false;
  controls.autoRotate = false;
  const direction = new THREE.Vector3(0.72, 0.55, 0.95).normalize();
  const framing = framingForBounds(box, 1.8);
  const target = framing.target.clone();
  moveCamera(target.clone().addScaledVector(direction, framing.distance), target, 780);
};

const collectPartMaterials = (part: ActuatorPart): void => {
  const meshes: THREE.Mesh[] = [];
  const materials = new Set<THREE.Material>();
  const standardMaterials: THREE.MeshStandardMaterial[] = [];

  part.object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    meshes.push(child);
    child.castShadow = true;
    child.receiveShadow = true;
    child.userData.part = part;

    const list = Array.isArray(child.material) ? child.material : [child.material];
    for (const material of list) {
      if (materials.has(material)) continue;
      materials.add(material);
      if (material instanceof THREE.MeshStandardMaterial) {
        material.emissive = new THREE.Color(0xc2652a);
        material.emissiveIntensity = 0;
        standardMaterials.push(material);
      }
    }
  });

  part.meshes = meshes;
  part.allMaterials = [...materials];
  part.standardMaterials = standardMaterials;
  part.object.userData.part = part;
};

const driveGroupsFor = (loaded: LoadedActuator): DriveGroups => {
  const input: THREE.Object3D[] = [];
  const output: THREE.Object3D[] = [];
  const cage: THREE.Object3D[] = [];
  const halfSpeed: THREE.Object3D[] = [];

  for (const part of loaded.parts) {
    if (part.spec.group === 'input') input.push(part.object);
    else if (part.spec.group === 'output') output.push(part.object);
    else if (part.spec.node === 'Cross_Roller_Cage') cage.push(part.object);
  }
  for (const child of loaded.childGroups) {
    if (child.group === 'input') input.push(child.object);
    else if (child.group === 'output') output.push(child.object);
    else if (child.group === 'half_speed') halfSpeed.push(child.object);
  }

  return { input, output, cage, halfSpeed, flexMaterial: flexMaterial ?? undefined };
};

const updateDriveReadout = (): void => {
  const rpm = Number(inputRpmInput.value);
  inputRpmValue.textContent = `${rpm} rpm`;
  outputRpmText.textContent = `${outputRpm(rpm, gearRatio).toFixed(1)} rpm`;
};

const setDriveEnabled = (on: boolean): void => {
  driveEnabled = on;
  driveButton.classList.toggle('is-active', on);
  driveButton.setAttribute('aria-pressed', String(on));
  driveControls.hidden = !on;
  if (on) {
    drive?.setInputRpm(Number(inputRpmInput.value));
    setGhosted(true);
  } else {
    setGhosted(false);
  }
  updateDriveReadout();
};

const updateRatioUI = (ratio: number): void => {
  ratioInput.value = String(ratio);
  ratioValue.textContent = `${Number.isInteger(ratio) ? ratio : ratio.toFixed(1)}:1`;
  updateDriveReadout();
};

/**
 * Swap the five hidden CAD harmonic nodes for the live procedural gear set.
 * The set is rotated -90° about X so its Z-up stations land in the GLB's
 * Y-up frame; its children stay in the CAD frame for the flexspline shader.
 */
const installGearSet = (loaded: LoadedActuator, ratio: number): void => {
  const previous = gearSet;
  const savedRotations = new Map<string, THREE.Euler>();
  if (previous) {
    for (const child of previous.children) savedRotations.set(child.name, child.rotation.clone());
  }

  const params = gearParams(ratio);
  const next = buildGearSet(params);
  next.name = 'Harmonic_Gear_Set';
  next.rotation.x = -Math.PI / 2;

  const flexTeeth = next.getObjectByName('Flexspline_Teeth');
  if (flexTeeth instanceof THREE.Mesh) {
    flexMaterial = makeFlexMaterial(flexTeeth, params);
  }

  loaded.root.add(next);

  const byName = new Map(next.children.map((child) => [child.name, child]));
  for (const part of loaded.parts) {
    if (!part.spec.procedural) continue;
    const object = byName.get(part.spec.node);
    if (!object) {
      console.warn(`[ha-110] Missing procedural gear child: ${part.spec.node}`);
      continue;
    }
    const saved = savedRotations.get(object.name);
    if (saved) object.rotation.copy(saved);

    part.object = object;
    part.basePosition = object.position.clone();
    part.baseQuaternion = object.quaternion.clone();
    part.offset = toModelOffset(part.spec.explode_offset);
    collectPartMaterials(part);
  }

  if (previous) disposeGearSet(previous);
  gearSet = next;
  gearRatio = ratio;

  next.updateMatrixWorld(true);
  for (const part of loaded.parts) {
    if (part.spec.procedural && part.object.parent === next) {
      part.localBox = new THREE.Box3().setFromObject(part.object);
    }
  }

  loaded.pickMeshes = [];
  loaded.root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    let node: THREE.Object3D | null = object;
    while (node) {
      if (!node.visible) return;
      node = node.parent;
    }
    loaded.pickMeshes.push(object);
  });
  loaded.bounds = new THREE.Box3().setFromObject(loaded.root);

  drive?.setRatio(ratio);
  drive?.setGroups(driveGroupsFor(loaded));

  exploder?.update(0);
  captureMaterialStates(true);
  if (cutEnabled) setCutEnabled(true);
  if (transmissionGhosted) setGhosted(true);
  if (gearGhosted) setGearGhost(true);
  updateRatioUI(ratio);
};

const syncDiagram = (): void => {
  if (!diagramOpen || !meshDiagram) return;
  meshDiagram.setState({
    ratio: gearRatio,
    waveAngle: drive?.waveAngle ?? 0,
    outputAngle: drive?.outputAngle ?? 0,
    inputRpm:
      driveEnabled && !drivePaused && !reduceMotion ? Number(inputRpmInput.value) : 0,
  });
};

const openDiagram = (): void => {
  if (diagramOpen) return;
  selectPart(null, false);
  diagramPanel.hidden = false;
  diagramOpen = true;
  diagramKicker.textContent = `STRUCTURE · ${
    Number.isInteger(gearRatio) ? gearRatio : gearRatio.toFixed(1)
  }:1`;
  if (!meshDiagram) meshDiagram = new MeshDiagram(diagramCanvas);
  meshDiagram.setVisible(true);
  syncDiagram();
};

const closeDiagram = (): void => {
  if (!diagramOpen) return;
  diagramOpen = false;
  meshDiagram?.setVisible(false);
  diagramPanel.hidden = true;
};

const debugApi = {
  cutEnabled: () => cutEnabled,
  checkCut: () => {
    const part = (node: string) => actuator?.parts.find((item) => item.spec.node === node);
    const clipped = (node: string) =>
      part(node)?.allMaterials.every(
        (material) => Array.isArray(material.clippingPlanes) && material.clippingPlanes.length > 0,
      ) ?? null;
    const unclipped = (node: string) =>
      part(node)?.allMaterials.every((material) => material.clippingPlanes === null) ?? null;
    return {
      cutEnabled,
      bodyClipped: clipped('Body_Housing'),
      fsUnclipped: unclipped('Flexspline_Cup'),
      wgUnclipped: unclipped('Wave_Generator_Cam'),
      outputFlangeUnclipped: unclipped('Output_Flange'),
    };
  },
  gear: () => {
    const params = gearParams(gearRatio);
    const base = { ratio: gearRatio, zf: params.zf, zc: params.zc, module: params.module };
    if (!gearSet) return { ...base, children: [], pickMeshes: 0 };
    const bounds = new THREE.Box3().setFromObject(gearSet);
    return {
      ...base,
      children: gearSet.children.map((child) => child.name),
      pickMeshes: actuator?.pickMeshes.length ?? 0,
      bounds: {
        min: bounds.min.toArray().map((value) => Number(value.toFixed(2))),
        max: bounds.max.toArray().map((value) => Number(value.toFixed(2))),
      },
    };
  },
  setRatio: (value: number): number => {
    if (!actuator) {
      gearRatio = snapRatio(value);
      updateRatioUI(gearRatio);
      return gearRatio;
    }
    if (selected) selectPart(null, false);
    installGearSet(actuator, snapRatio(value));
    return gearRatio;
  },
  materialOpacity: (node: string): number[] => {
    const part = actuator?.parts.find((item) => item.spec.node === node);
    return part?.allMaterials.map((material) => material.opacity) ?? [];
  },
  drive: () => {
    const uniforms = flexMaterial?.userData.flexUniforms as
      | { uFlexPsi?: { value: number } }
      | undefined;
    return {
      enabled: driveEnabled,
      paused: drivePaused,
      inputRpm: Number(inputRpmInput.value),
      ratio: gearRatio,
      outputRpm: outputRpm(Number(inputRpmInput.value), gearRatio),
      waveAngle: drive?.waveAngle ?? 0,
      outputAngle: drive?.outputAngle ?? 0,
      psi: uniforms?.uFlexPsi?.value ?? null,
    };
  },
  setDrive: (on: boolean): boolean => {
    setDriveEnabled(on);
    return driveEnabled;
  },
  setInputRpm: (rpm: number): number => {
    inputRpmInput.value = String(rpm);
    drive?.setInputRpm(rpm);
    updateDriveReadout();
    return Number(inputRpmInput.value);
  },
  diagram: () => ({
    open: diagramOpen,
    ratio: gearRatio,
    canvasVisible: !diagramPanel.hidden,
  }),
  camera: () => ({
    position: camera.position.toArray(),
    target: controls.target.toArray(),
  }),
  motion: () => ({
    reduceMotion,
    driveEnabled,
    autoRotate: controls.autoRotate,
    explodeValue: explodeInput.value,
  }),
};

(window as unknown as { __ha: typeof debugApi }).__ha = debugApi;

const boot = async () => {
  try {
    setLoading(0.03);
    const loaded = await loadActuator(
      `${assetBase}assets/harmonic_actuator_v2.glb`,
      `${assetBase}assets/harmonic_actuator.json`,
      setLoading,
    );

    actuator = loaded;
    scene.add(loaded.root);
    loaded.root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = true;
      object.receiveShadow = true;
    });

    installGearSet(loaded, loaded.manifest.ratio.default);

    for (const part of loaded.parts) {
      const note = TEACHING[part.spec.teaching];
      const option = document.createElement('option');
      option.value = part.spec.node;
      option.textContent = `${String(part.index + 1).padStart(2, '0')} · ${
        note?.title ?? part.spec.node
      }`;
      partSelect.append(option);
    }

    loadedBounds = loaded.bounds.clone();
    exploder = new Exploder(loaded.parts, loaded.maxOrder, reduceMotion);

    drive = new Drive(driveGroupsFor(loaded));
    drive.setRatio(loaded.manifest.ratio.default);
    drive.setInputRpm(Number(inputRpmInput.value));
    setDriveEnabled(!reduceMotion);

    updateExplodeUI(0);
    frameModel(loadedBounds);
    finishLoading();
  } catch (error) {
    showError(error);
  }
};

const clock = new THREE.Clock();

const animate = (now: number) => {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  if (driveEnabled && !drivePaused && !reduceMotion) drive?.update(dt);

  // The overlay pauses the 3D view but the transmission keeps advancing so
  // the inset stays live; the next 3D frame resumes at the same angle.
  if (diagramOpen) {
    syncDiagram();
    return;
  }

  exploder?.update(dt);
  if (cameraMove) {
    updateCameraMove(now);
  } else if (autoFit && !selected) {
    updateAutoFit(dt);
  } else {
    controls.update();
  }
  controls.autoRotate = !reduceMotion && !hasInteracted && !autoFit && !selected && !cameraMove;
  renderer.render(scene, camera);
};

explodeInput.addEventListener('input', () => {
  let percent = Number(explodeInput.value);
  if (reduceMotion) {
    percent = Math.round(percent / 50) * 50;
    explodeInput.value = String(percent);
  }
  if (selected) selectPart(null, false);
  updateExplodeUI(percent);
  exploder?.setProgress(percent / 100);
  autoFit = true;
  controls.autoRotate = false;
  document.body.classList.toggle('is-exploding', percent > 1);
  setHousingGhost(percent > 35);
  if (cutEnabled) setCutEnabled(false);
  setGhosted(false);
  setGearGhost(false);
  const blocked = percent > 5;
  drivePaused = blocked;
  driveButton.disabled = blocked;
  cutButton.disabled = blocked;
});

resetButton.addEventListener('click', resetCamera);

partClose.addEventListener('click', () => selectPart(null, true));

ratioInput.addEventListener('input', () => {
  const ratio = snapRatio(Number(ratioInput.value));
  updateRatioUI(ratio);
  if (ratioTimer !== null) window.clearTimeout(ratioTimer);
  ratioTimer = window.setTimeout(() => {
    ratioTimer = null;
    if (!actuator) return;
    if (selected) selectPart(null, false);
    installGearSet(actuator, ratio);
  }, 100);
});

cutButton.addEventListener('click', () => setCutEnabled(!cutEnabled));
driveButton.addEventListener('click', () => setDriveEnabled(!driveEnabled));
diagramButton.addEventListener('click', openDiagram);
diagramClose.addEventListener('click', closeDiagram);
inputRpmInput.addEventListener('input', () => {
  drive?.setInputRpm(Number(inputRpmInput.value));
  updateDriveReadout();
});
viewOverviewButton.addEventListener('click', resetCamera);
viewGearButton.addEventListener('click', focusGearView);
viewOutputButton.addEventListener('click', focusOutputView);

partSelect.addEventListener('change', () => {
  if (!actuator) return;
  const part = actuator.parts.find((item) => item.spec.node === partSelect.value) ?? null;
  if (part) selectPart(part);
  partSelect.value = '';
});

let pointerDown = { x: 0, y: 0, time: 0 };

renderer.domElement.addEventListener('pointerdown', (event) => {
  pointerDown = { x: event.clientX, y: event.clientY, time: performance.now() };
  cancelCameraMove();
});

renderer.domElement.addEventListener('pointerup', (event) => {
  const distance = Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y);
  const elapsed = performance.now() - pointerDown.time;
  if (distance > 6 || elapsed > 650) return;

  const part = pickPart(event.clientX, event.clientY);
  if (part) {
    if (part === selected) selectPart(null);
    else selectPart(part);
  } else {
    selectPart(null);
  }
});

window.addEventListener('pointermove', (event) => {
  const target = event.target instanceof Element ? event.target : null;
  const overUI = Boolean(
    target?.closest(
      'button,input,select,.console,.part-card,.intro,.topbar,.loading,.error,.diagram-panel,.hover-label',
    ),
  );
  pointerOverUI = overUI;
  if (overUI) {
    setHover(null);
    return;
  }

  const rect = renderer.domElement.getBoundingClientRect();
  pointer.set(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1,
  );
  pointerX = event.clientX;
  pointerY = event.clientY;
  pointerInside = true;

  if (hovered) positionHoverLabel();
  if (isDragging) return;

  const part = pickPart(event.clientX, event.clientY);
  setHover(part);
});

window.addEventListener('pointerleave', () => {
  pointerInside = false;
  setHover(null);
});

const isFormTarget = (target: EventTarget | null): boolean =>
  target instanceof Element &&
  Boolean(target.closest('button,input,select,textarea,a,[contenteditable="true"]'));

const cyclePart = (direction: number): void => {
  if (!actuator || actuator.parts.length === 0) return;
  const parts = actuator.parts;
  const current = selected ? parts.indexOf(selected) : -1;
  const next =
    current < 0
      ? direction > 0
        ? 0
        : parts.length - 1
      : (current + direction + parts.length) % parts.length;
  selectPart(parts[next]);
};

const rotateView = (deltaTheta: number, deltaPhi: number): void => {
  cancelCameraMove();
  const offset = camera.position.clone().sub(controls.target);
  const spherical = new THREE.Spherical().setFromVector3(offset);
  spherical.theta += deltaTheta;
  spherical.phi = THREE.MathUtils.clamp(
    spherical.phi + deltaPhi,
    controls.minPolarAngle,
    controls.maxPolarAngle,
  );
  camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical));
  controls.update();
  hasInteracted = true;
  autoFit = false;
  controls.autoRotate = false;
};

const zoomView = (factor: number): void => {
  cancelCameraMove();
  const offset = camera.position.clone().sub(controls.target);
  const distance = THREE.MathUtils.clamp(
    offset.length() * factor,
    controls.minDistance,
    controls.maxDistance,
  );
  camera.position.copy(controls.target).add(offset.setLength(distance));
  controls.update();
  hasInteracted = true;
  autoFit = false;
  controls.autoRotate = false;
};

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    if (diagramOpen) {
      closeDiagram();
      return;
    }
    selectPart(null, true);
    return;
  }
  if (diagramOpen || isFormTarget(event.target)) return;

  if (event.key === 'Tab') {
    event.preventDefault();
    cyclePart(event.shiftKey ? -1 : 1);
    return;
  }
  if (event.key === 'Enter') {
    if (!selected && hovered) selectPart(hovered);
    return;
  }
  if (event.key === '+' || event.key === '=') {
    event.preventDefault();
    zoomView(0.86);
    return;
  }
  if (event.key === '-') {
    event.preventDefault();
    zoomView(1.16);
    return;
  }
  if (event.key.toLowerCase() === 'r') {
    event.preventDefault();
    resetCamera();
    return;
  }
  if (event.key.startsWith('Arrow')) {
    event.preventDefault();
    if (event.key === 'ArrowLeft') rotateView(0.09, 0);
    else if (event.key === 'ArrowRight') rotateView(-0.09, 0);
    else if (event.key === 'ArrowUp') rotateView(0, -0.06);
    else if (event.key === 'ArrowDown') rotateView(0, 0.06);
  }
});

controls.addEventListener('start', () => {
  hasInteracted = true;
  autoFit = false;
  isDragging = true;
  controls.autoRotate = false;
  setHover(null);
  cancelCameraMove();
});

controls.addEventListener('end', () => {
  isDragging = false;
});

const onResize = () => {
  const width = container.clientWidth;
  const height = container.clientHeight;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  if (loadedBounds && !hasInteracted && !autoFit) frameModel(loadedBounds);
};

window.addEventListener('resize', onResize);
requestAnimationFrame(animate);
void boot();
