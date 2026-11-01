import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Exploder } from './engine/exploder.ts';
import { loadActuator } from './engine/loadActuator.ts';
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
  !resetButton
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

interface GhostState {
  material: THREE.Material;
  transparent: boolean;
  opacity: number;
  depthWrite: boolean;
}

let ghostStates: GhostState[] = [];

const setHousingGhost = (on: boolean) => {
  for (const state of ghostStates) {
    state.material.transparent = on ? true : state.transparent;
    state.material.opacity = on ? 0.18 : state.opacity;
    state.material.depthWrite = on ? false : state.depthWrite;
    state.material.needsUpdate = true;
  }
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

const boot = async () => {
  try {
    setLoading(0.03);
    const loaded = await loadActuator(
      `${assetBase}assets/harmonic_actuator_v2.glb`,
      `${assetBase}assets/harmonic_actuator.json`,
      setLoading,
    );

    scene.add(loaded.root);
    loaded.root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = true;
      object.receiveShadow = true;
    });

    loadedBounds = loaded.bounds.clone();
    exploder = new Exploder(loaded.parts, loaded.maxOrder, reduceMotion);

    const ghostNodes = new Set([
      'Body_Housing',
      'Rear_End_Bell',
      'Rear_Cover',
      'Output_Cap_Mount_Flange',
    ]);
    ghostStates = loaded.parts
      .filter((part) => ghostNodes.has(part.spec.node))
      .flatMap((part) =>
        part.allMaterials.map((material) => ({
          material,
          transparent: material.transparent,
          opacity: material.opacity,
          depthWrite: material.depthWrite,
        })),
      );

    updateExplodeUI(0);
    frameModel(loadedBounds);
    finishLoading();
  } catch (error) {
    showError(error);
  }
};

const clock = new THREE.Clock();

const animate = () => {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  exploder?.update(dt);
  updateAutoFit(dt);
  controls.autoRotate = !reduceMotion && !hasInteracted && !autoFit;
  controls.update();
  renderer.render(scene, camera);
};

explodeInput.addEventListener('input', () => {
  const percent = Number(explodeInput.value);
  updateExplodeUI(percent);
  exploder?.setProgress(percent / 100);
  autoFit = true;
  controls.autoRotate = false;
  document.body.classList.toggle('is-exploding', percent > 1);
  setHousingGhost(percent > 35);
  const blocked = percent > 5;
  driveButton.disabled = blocked;
  cutButton.disabled = blocked;
});

resetButton.addEventListener('click', () => {
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
  if (loadedBounds) frameModel(loadedBounds);
});

controls.addEventListener('start', () => {
  hasInteracted = true;
  autoFit = false;
  controls.autoRotate = false;
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
