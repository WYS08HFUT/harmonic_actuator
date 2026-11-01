import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import './style.css';

const container = document.querySelector<HTMLDivElement>('#scene-container');
const loading = document.querySelector<HTMLDivElement>('#loading');
const loadingBar = document.querySelector<HTMLDivElement>('#loading-bar');
const loadingPercent = document.querySelector<HTMLSpanElement>('#loading-percent');

if (!container || !loading || !loadingBar || !loadingPercent) {
  throw new Error('Page shell is missing required elements');
}

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setClearColor(0x000000, 0);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.02;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#f7f5f0');

const camera = new THREE.PerspectiveCamera(
  31,
  container.clientWidth / container.clientHeight,
  0.1,
  4000,
);
camera.position.set(178, 148, 228);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.enablePan = false;
controls.minDistance = 90;
controls.maxDistance = 720;
controls.target.set(0, 58, 0);
controls.autoRotate = !reduceMotion;
controls.autoRotateSpeed = 0.32;
controls.update();

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
pmrem.dispose();

const hemi = new THREE.HemisphereLight(0xfdfbf6, 0xcfc8bc, 1.4);
scene.add(hemi);

const key = new THREE.DirectionalLight(0xfff2e2, 2.3);
key.position.set(200, 300, 180);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.left = -260;
key.shadow.camera.right = 260;
key.shadow.camera.top = 260;
key.shadow.camera.bottom = -260;
key.shadow.camera.near = 20;
key.shadow.camera.far = 900;
key.shadow.bias = -0.0002;
scene.add(key);

const fill = new THREE.DirectionalLight(0xdfe9f2, 0.75);
fill.position.set(-220, 120, 120);
scene.add(fill);

const rim = new THREE.DirectionalLight(0xffd9bd, 0.55);
rim.position.set(-80, 220, -240);
scene.add(rim);

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(280, 96),
  new THREE.ShadowMaterial({ color: 0x2a241e, opacity: 0.1 }),
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const placeholder = new THREE.Mesh(
  new THREE.BoxGeometry(54, 54, 54, 4, 4, 4),
  new THREE.MeshStandardMaterial({ color: '#c4c9d1', metalness: 0.62, roughness: 0.28 }),
);
placeholder.position.set(0, 62, 0);
placeholder.castShadow = true;
placeholder.receiveShadow = true;
scene.add(placeholder);

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
    }, 600);
  }, 220);
};

const clock = new THREE.Clock();

const animate = () => {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  if (!reduceMotion) placeholder.rotation.y += dt * 0.22;
  controls.update();
  renderer.render(scene, camera);
};

const onResize = () => {
  const width = container.clientWidth;
  const height = container.clientHeight;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
};

window.addEventListener('resize', onResize);
setLoading(0.4);
requestAnimationFrame(animate);
finishLoading();
