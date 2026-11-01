import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { PILLAR_META, TEACHING } from './data/teaching.ts';
import { Exploder } from './engine/exploder.ts';
import { loadActuator } from './engine/loadActuator.ts';
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
  !hoverName
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

const captureMaterialStates = () => {
  if (!actuator) return;
  materialStates = actuator.parts.flatMap((part) =>
    part.allMaterials.map((material) => ({
      material,
      transparent: material.transparent,
      opacity: material.opacity,
      depthWrite: material.depthWrite,
      side: material.side,
    })),
  );
};

const stateByMaterial = () => new Map(materialStates.map((state) => [state.material, state]));

const setPartGhost = (labels: Set<string>, on: boolean) => {
  if (!actuator) return;
  const states = stateByMaterial();
  for (const part of actuator.parts) {
    if (!labels.has(part.spec.node)) continue;
    for (const material of part.allMaterials) {
      const state = states.get(material);
      if (!state) continue;
      material.transparent = on ? true : state.transparent;
      material.opacity = on ? 0.2 : state.opacity;
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

const TRANSMISSION_GHOST = new Set([
  'Body_Housing',
  'Frameless_Stator_Core',
  'Copper_Stator_Windings',
  'Circular_Spline_Ring',
  'Output_Cap_Mount_Flange',
]);

const setHousingGhost = (on: boolean) => setPartGhost(EXPLODE_GHOST, on);
const setGhosted = (on: boolean) => setPartGhost(TRANSMISSION_GHOST, on);

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
  setHousingGhost(false);
  setGhosted(false);
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
  hasInteracted = true;
  autoFit = false;
  controls.autoRotate = false;
  const direction = new THREE.Vector3(0.34, 0.24, 1.0).normalize();
  const framing = framingForBounds(box, 1.55);
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
  hasInteracted = true;
  autoFit = false;
  controls.autoRotate = false;
  const direction = new THREE.Vector3(0.72, 0.55, 0.95).normalize();
  const framing = framingForBounds(box, 1.8);
  const target = framing.target.clone();
  moveCamera(target.clone().addScaledVector(direction, framing.distance), target, 780);
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

    captureMaterialStates();

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
  const percent = Number(explodeInput.value);
  if (selected) selectPart(null, false);
  updateExplodeUI(percent);
  exploder?.setProgress(percent / 100);
  autoFit = true;
  controls.autoRotate = false;
  document.body.classList.toggle('is-exploding', percent > 1);
  setHousingGhost(percent > 35);
  if (cutEnabled) setCutEnabled(false);
  setGhosted(false);
  const blocked = percent > 5;
  driveButton.disabled = blocked;
  cutButton.disabled = blocked;
});

resetButton.addEventListener('click', resetCamera);

partClose.addEventListener('click', () => selectPart(null, true));

cutButton.addEventListener('click', () => setCutEnabled(!cutEnabled));
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

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') selectPart(null, true);
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
