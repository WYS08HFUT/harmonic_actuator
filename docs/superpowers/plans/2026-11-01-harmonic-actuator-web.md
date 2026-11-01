# Harmonic Actuator Interactive Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the single-screen, light-industrial interactive explainer for the HA-110 harmonic joint actuator: exploded view, cutaway with semi-transparent housing, live 50:1 transmission with continuous ratio/input-speed controls, clickable part cards, and a 2D section panel with a live tooth-mesh inset.

**Architecture:** Vite + TypeScript + Three.js, modeled on `AI_design/爆炸视图/`. The app loads `web/public/assets/harmonic_actuator_v2.glb` plus `harmonic_actuator.json`; the GLB provides the static parts, the manifest provides explode offsets/orders/rotation groups, and `harmonicGears.ts` + `flexspline.ts` replace the fixed 50:1 harmonic nodes with procedural, ratio-driven geometry and deformation. UI is plain DOM; the 2D inset is Canvas 2D.

**Tech Stack:** Vite 8, TypeScript 7, Three.js 0.187, `tsx` + Node's test runner, `puppeteer-core` + local Chrome for visual checks.

**Spec:** `docs/superpowers/specs/2026-11-01-harmonic-actuator-explainer-design.md`

**Prerequisite:** The CAD plan (`docs/superpowers/plans/2026-11-01-harmonic-actuator-cad-v2.md`) has exported `harmonic_actuator_v2.glb`, `harmonic_actuator.json`, and `harmonic_actuator_section_teaching.svg` into `web/public/assets/`.

## Global Constraints

- Light premium industrial: warm off-white background, soft studio light, metallic PBR, copper accent `#C2652A`, graphite text `#1F2328`, steel `#5B6B7A`.
- Single-screen tool; bottom control bar; no page scrolling for the main experience.
- Explode slider 0–100%; cutaway toggle; transmission toggle (auto-run); input speed 0–3000 rpm; ratio 20–100 with 0.5 step; diagram button; reset.
- Ratio math: `i = Zf/(Zc−Zf)`, `Zf=2i`, `Zc=Zf+2`, `m=25/i`, pitch radius 25 mm; working WG major/minor = FS inner radius ± m.
- Input speed display is real rpm; 3D uses a 1/20 visual slow-motion with a visible “演示慢放 ×1/20” badge.
- Copy: Chinese, customer/popular-science level; performance claims only as structure principles + “结构原理示意，最终参数以正式规格书为准”; no torque/speed numbers.
- No React; no post-processing; `pixelRatio = min(devicePixelRatio, 2)`.
- Keyboard: Tab/Shift+Tab part focus, arrows rotate, +/− zoom, Esc close, R reset; support `prefers-reduced-motion`.
- Commit after every task.

## Review Focus

- Ratio 20 and 100: tooth counts, module, WG major/minor, and output speed stay finite and consistent; no NaN geometry.
- Flexspline deformation near the diaphragm: no collapse, seam, or inverted normals.
- Cutaway + semi-transparent CS: the tooth mesh remains readable, not a translucent blob; no z-fighting.
- Mobile 390 px: bottom bar, part drawer, and 2D panel remain usable; canvas does not jump on resize.
- Missing/failed GLB or manifest: a clear error panel, not a blank canvas.

---

### Task 0: Scaffold the Vite + Three.js app

**Files:**
- Create: `web/package.json`
- Create: `web/tsconfig.json`
- Create: `web/vite.config.ts`
- Create: `web/index.html`
- Create: `web/src/main.ts`
- Create: `web/src/style.css`
- Create: `web/scripts/visual-check.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: `npm run dev`, `npm run build`, `npm test`, `npm run check:visual`.

- [ ] **Step 1: Create `web/package.json`**

```json
{
  "name": "ha-110-explainer",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "node --import tsx --test src/engine/*.test.ts src/data/*.test.ts",
    "check:visual": "node scripts/visual-check.mjs"
  },
  "dependencies": { "three": "^0.187.0" },
  "devDependencies": {
    "@types/three": "^0.186.0",
    "puppeteer-core": "^25.16.0",
    "tsx": "^4.20.0",
    "typescript": "^7.0.2",
    "vite": "^8.3.5"
  }
}
```

- [ ] **Step 2: Create the Vite/TS config and a minimal scene**

`vite.config.ts`: `base: './'`, `server.port = 5173`, `build.target = 'es2022'`.
`tsconfig.json`: `strict: true`, `moduleResolution: 'bundler'`, `types: ['vite/client']`, `noEmit: true`, `allowImportingTsExtensions: true`.
`index.html`: `<div id="scene-container">`, loading/error overlays, top bar, bottom control bar, part card, hover label, diagram panel; all IDs from the spec.
`src/main.ts`: a `WebGLRenderer`, `PerspectiveCamera`, `OrbitControls`, `RoomEnvironment`, a temporary rotating box; append the canvas.

- [ ] **Step 3: Write the first failing test**

Create `src/engine/smoke.test.ts`:

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { add } from './smoke.ts';

test('test runner works', () => {
  assert.equal(add(2, 3), 5);
});
```

Run: `cd web && npm install && npm test`
Expected: FAIL with `Cannot find module './smoke.ts'`.

- [ ] **Step 4: Implement `src/engine/smoke.ts` and verify**

```ts
export function add(a: number, b: number): number { return a + b; }
```

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Verify the build and dev server**

Run: `npm run build`
Expected: `vite build` completes and `dist/index.html` exists.

- [ ] **Step 6: Commit**

```bash
git add web
git commit -m "feat(web): scaffold Vite + Three.js app"
```

---

### Task 1: Manifest types and pure parsing

**Files:**
- Create: `web/src/engine/types.ts`
- Create: `web/src/engine/manifest.ts`
- Create: `web/src/engine/manifest.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `RotationGroup = 'static' | 'input' | 'output' | 'half_speed'`
  - `PartSpec { node, group, explode_offset, explode_order, cut?, ghost_in_transmission?, teaching, procedural? }`
  - `ActuatorManifest { id, title, units, axis, parts, ratio:{min,max,step,default}, input_speed:{min,max,default,visual_scale} }`
  - `parseManifest(data: unknown): ActuatorManifest`

- [ ] **Step 1: Write the failing test**

`manifest.test.ts` asserts:
- A valid 1-part manifest parses and returns the same node/group.
- Missing `parts` throws `/parts/`.
- `ratio.step <= 0` throws `/ratio/`.
- A part with an unknown group throws `/group/`.
- Duplicate node names throw `/duplicate/`.
- `explode_offset` not length 3 throws `/explode_offset/`.

- [ ] **Step 2: Run to verify failure**

Run: `npm test`
Expected: FAIL with `Cannot find module './manifest.ts'`.

- [ ] **Step 3: Implement `types.ts` and `manifest.ts`**

`parseManifest` validates required keys, finite numbers, node uniqueness, group membership, offset length, and `units === 'mm'` / `axis === 'Z'`. Throw `Error` with the field name in the message.

- [ ] **Step 4: Run to verify pass**

Run: `npm test`
Expected: all manifest tests PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/engine/types.ts web/src/engine/manifest.ts web/src/engine/manifest.test.ts
git commit -m "feat(web): validate actuator manifest"
```

---

### Task 2: Load the GLB, find named parts, and frame the scene

**Files:**
- Create: `web/src/engine/loadActuator.ts`
- Create: `web/src/engine/loadActuator.test.ts`
- Modify: `web/src/main.ts`
- Modify: `web/index.html`
- Modify: `web/src/style.css`

**Interfaces:**
- Consumes: `ActuatorManifest`, `PartSpec` from Task 1.
- Produces:
  - `ActuatorPart { index, spec, object, meshes, allMaterials, standardMaterials, basePosition, baseQuaternion, offset, localBox }`
  - `LoadedActuator { root, manifest, parts, pickMeshes, bounds, maxOrder, proceduralNodes }`
  - `loadActuator(glbUrl, manifestUrl, onProgress?): Promise<LoadedActuator>`
  - `findNode(root, name): THREE.Object3D | null` (exported for tests)

- [ ] **Step 1: Write the failing test**

`loadActuator.test.ts` uses a plain `THREE.Group` with named children (`Body_Housing`, `Flexspline_Cup`) and a two-part manifest; asserts `findNode` returns the child, missing names return null, and `bounds` is finite. No GLB fetch in this test.

- [ ] **Step 2: Run to verify failure**

Run: `npm test`
Expected: FAIL with `Cannot find module './loadActuator.ts'`.

- [ ] **Step 3: Implement the loader**

`loadActuator` fetches the manifest (via `parseManifest`) and loads the GLB with `GLTFLoader`. For each manifest part: find the node, clone its materials, set emissive for highlight, record base position/quaternion, compute local box, add to `pickMeshes`. Hide nodes whose `spec.procedural === true` (`object.visible = false`) and record them in `proceduralNodes`. Compute bounds from visible parts. `onProgress` receives the GLB download fraction.

- [ ] **Step 4: Wire the loader into `main.ts`**

Load `${import.meta.env.BASE_URL}assets/harmonic_actuator_v2.glb` and `.../harmonic_actuator.json`; hide loading on success; show `#error` with the message on failure. Frame the model with `framingForBounds` (copy the reference pattern). Add a soft ground shadow plane and `RoomEnvironment`. Verify with `npm run dev`.

- [ ] **Step 5: Run tests and build**

Run: `npm test && npm run build`
Expected: tests PASS; build succeeds.

- [ ] **Step 6: Commit**

```bash
git add web/src/engine/loadActuator.ts web/src/engine/loadActuator.test.ts web/src/main.ts web/index.html web/src/style.css
git commit -m "feat(web): load GLB + manifest and frame the actuator"
```

---

### Task 3: Exploder and bottom control bar

**Files:**
- Create: `web/src/engine/exploder.ts`
- Create: `web/src/engine/exploder.test.ts`
- Modify: `web/src/main.ts`
- Modify: `web/src/style.css`

**Interfaces:**
- Consumes: `ActuatorPart`.
- Produces:
  - `explodeFactor(progress: number, order: number, maxOrder: number, reducedMotion: boolean): number`
  - `class Exploder { constructor(parts, maxOrder, reducedMotion); setProgress(value); update(dt): number; boundsAt(progress): THREE.Box3; progress; targetProgress; resetInstant(); }`

- [ ] **Step 1: Write the failing test**

`exploder.test.ts` asserts:
- `explodeFactor(0, 0, 10, false) === 0`.
- `explodeFactor(1, 0, 10, false) === 1`.
- `explodeFactor(1, 10, 10, false) === 1`.
- `explodeFactor(0.2, 10, 10, false) === 0` (delay).
- Reduced motion snaps 0/0.5/1 to 0/1/1.

- [ ] **Step 2: Run to verify failure**

Run: `npm test`
Expected: FAIL with `Cannot find module './exploder.ts'`.

- [ ] **Step 3: Implement the exploder**

Copy the reference's damped/staggered logic. `delay = order/maxOrder * 0.45`; `local = clamp01((progress - delay) / (1 - delay))`; ease-in-out cubic. `update` lerps the current progress toward the target with `THREE.MathUtils.damp(current, target, 6, dt)` and sets `object.position = basePosition + offset * eased`.

- [ ] **Step 4: Wire the slider**

`#explode` input sets `exploder.setProgress(value/100)`; update `#explode-value`; disable the transmission toggle when progress > 0.05; toggle `body.is-exploding`. Add `#btn-reset` to reset progress, transmission, cutaway, camera.

- [ ] **Step 5: Run tests and verify in the browser**

Run: `npm test && npm run dev`
Expected: tests PASS; dragging the slider separates the parts along the manifest offsets.

- [ ] **Step 6: Commit**

```bash
git add web/src/engine/exploder.ts web/src/engine/exploder.test.ts web/src/main.ts web/src/style.css
git commit -m "feat(web): add sluggish exploded-view slider"
```

---

### Task 4: Part hover, click, info cards, and teaching copy

**Files:**
- Create: `web/src/data/teaching.ts`
- Modify: `web/src/main.ts`
- Modify: `web/index.html`
- Modify: `web/src/style.css`

**Interfaces:**
- Consumes: `LoadedActuator`, `ActuatorPart`.
- Produces: `TEACHING: Record<string, { title: string; what: string; why: string; hint: string; pillar: 'space' | 'drive' | 'control' }>`; `PILLAR_META`.

- [ ] **Step 1: Write the failing test**

Create `web/src/data/teaching.test.ts` asserting:
- Every key used by the manifest export list exists (the test imports a local `TEACHING_KEYS` array copied from the manifest plan).
- Every entry has non-empty `title`, `what`, `why`, `hint`; `what` ≤ 40 chars, `why` ≤ 60, `hint` ≤ 40.
- `pillar` is one of the three.

- [ ] **Step 2: Run to verify failure**

Run: `npm test`
Expected: FAIL with `Cannot find module './teaching.ts'`.

- [ ] **Step 3: Write the teaching copy**

Write 24 entries for: body, stator, windings, rotor, magnets, sleeve, rear_end_bell, rear_cover, rear_bearing, front_bearing, input_encoder_ring, input_encoder_pcb, cs, fs, wg_cam, wg_balls, wg_race, crb_outer, crb_inner, crb_cage, output_flange, output_encoder_ring, output_encoder_pcb, output_cap. Each card follows: what (plain-language function), why (design reason tied to space/drive/control), hint (a counter-intuitive point). Use the spec's allowed claims; no torque/speed numbers.

- [ ] **Step 4: Implement picking and the card**

Raycast against `pickMeshes`; on hover, show `#hover-label` with the title; on click, focus the camera on the part, open `#part-card`, fill title/what/why/hint, set `data-pillar`. Esc/close restores the previous camera. Populate `#part-select` with all parts for keyboard users.

- [ ] **Step 5: Verify in the browser**

Run: `npm run dev`
Expected: every part shows a hover label and a non-empty card; clicking empty space closes the card.

- [ ] **Step 6: Commit**

```bash
git add web/src/data/teaching.ts web/src/data/teaching.test.ts web/src/main.ts web/index.html web/src/style.css
git commit -m "feat(web): add part picking and customer-facing teaching cards"
```

---

### Task 5: Cutaway, ghosting, and camera presets

**Files:**
- Modify: `web/src/main.ts`
- Modify: `web/src/style.css`

**Interfaces:**
- Consumes: `LoadedActuator`.
- Produces: `setCutEnabled(on: boolean)`, `setGhosted(on: boolean)`, `focusGearView()`, `focusOutputView()`, `resetCamera()`.

- [ ] **Step 1: Write the failing behavior test**

Add a `data-testid` to the cut button and a small DOM test? Prefer a Puppeteer visual check; this task's check is the screenshot `ha-cut.png` showing the motor/CRB internal path without a translucent blob. Add an in-app assertion: after enabling cut, the FS/WG/output flange materials have `clippingPlanes === null`.

- [ ] **Step 2: Implement the clipping**

Create `cutPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), zCenter)`. On cut: assign `clippingPlanes = [cutPlane]` to body/stator/windings/CS/rear bell/rear cover/output cap materials; leave FS/WG/output flange/CRB inner untouched. Use double-sided materials or a cap color for the cut faces. On transmission: set body/stator/windings/CS materials to `transparent=true`, `opacity=0.2`, `depthWrite=false`; restore on exit.

- [ ] **Step 3: Add the 90° harmonic window visual**

The global cut removes the front half; add a thin `Box` clip or a second plane that removes only the 12 o'clock wedge of the body/CS around Z60–87. The FS/WG stay intact. If a second clipping plane is not practical, use a `THREE.Group` mask/`clipIntersection`; document the choice. The check: from the gear-camera preset, the CS teeth and FS teeth are visible.

- [ ] **Step 4: Add camera presets**

`整机` / `齿部` / `输出端` buttons. The gear view looks down Z with a 10–15° tilt and frames Z58–95; the output view frames Z90–122. Use the reference's `framingForBounds` + `moveCamera`.

- [ ] **Step 5: Verify with screenshots**

Run the dev server and `npm run check:visual`; inspect `ha-cut.png` and a new `ha-gear.png`.
Expected: internals visible; FS teeth not cut; no z-fighting.

- [ ] **Step 6: Commit**

```bash
git add web/src/main.ts web/src/style.css web/scripts/visual-check.mjs
git commit -m "feat(web): add cutaway, ghosting, and camera presets"
```

---

### Task 6: Procedural harmonic gear set with continuous ratio

**Files:**
- Create: `web/src/engine/harmonicGears.ts`
- Create: `web/src/engine/harmonicGears.test.ts`
- Modify: `web/src/main.ts`

**Interfaces:**
- Consumes: `ActuatorManifest` ratio range; `THREE`.
- Produces:
  - `snapRatio(value: number): number` (clamp 20–100, round to 0.5)
  - `gearParams(ratio: number): GearParams`
  - `buildGearSet(params: GearParams): THREE.Group` with children named `Flexspline_Cup`, `Circular_Spline_Ring`, `Wave_Generator_Cam`, `Wave_Generator_Balls`, `Wave_Generator_Flexible_Race`
  - `disposeGearSet(group: THREE.Group): void`
  - `GearParams { ratio, zf, zc, module, fsPitchRadius, fsTipRadius, fsRootRadius, fsInnerRadius, csPitchRadius, csTipRadius, csRootRadius, wgMajorRadius, wgMinorRadius }`

- [ ] **Step 1: Write the failing tests**

`harmonicGears.test.ts` asserts:
- `snapRatio(49.7) === 49.5`, `snapRatio(19) === 20`, `snapRatio(101) === 100`.
- `gearParams(50)` → zf 100, zc 102, module 0.5, fsPitch 25, fsTip 25.5, fsRoot 24.375, fsInner 23.525, csPitch 25.5, csTip 25.0, csRoot 26.125, wgMajor 24.025, wgMinor 23.025.
- `gearParams(20)` → zf 40, zc 42, module 1.25; `gearParams(100)` → zf 200, zc 202, module 0.25.
- `wgMajorRadius - wgMinorRadius === module` for all ratios.
- `buildGearSet(gearParams(50))` returns children with the five names and finite bounding boxes.

- [ ] **Step 2: Run to verify failure**

Run: `npm test`
Expected: FAIL with `Cannot find module './harmonicGears.ts'`.

- [ ] **Step 3: Implement `gearParams` and `snapRatio`**

Use the exact formulas; throw on out-of-range. `zf = 2*ratio`, `zc = zf+2`, `module = 25/ratio`, `fsRoot = 25 - 1.25*module`, `fsInner = fsRoot - 0.85`, `csPitch = 25+module`, `csTip = csPitch-module`, `csRoot = csPitch+1.25*module`, `wgMajor = fsInner+module`, `wgMinor = fsInner-module`.

- [ ] **Step 4: Implement the tooth-ring geometry**

Generate a closed annular BufferGeometry for the FS external teeth and the CS internal teeth. Sample each tooth with a trapezoidal profile: flat tip, flat root, 20° flanks, 0.25m radial clearance, 0.06m backlash. Top/bottom faces are triangle fans between the outer profile and the inner circle; side walls connect the two. FS tooth band Z61–73, cup wall Z73–84, diaphragm Z82–87; CS Z60–74. Use the spec's phase: FS tooth 0 at ψ=0, CS tooth space at ψ=0, CS tooth centers offset by half a pitch. Build the WG elliptical cam (major/minor), 18 balls at the pitch ellipse, and the elliptical race wall 1.0. Assign the spec colors.

- [ ] **Step 5: Replace the hidden GLB harmonic nodes**

In `main.ts`, after load, create `gearSet = buildGearSet(gearParams(50))`; add it to the scene; hide the GLB nodes listed in `proceduralNodes`. Map the manifest part specs for the five nodes to the procedural children so explode offsets, orders, picking, and teaching cards still work. On ratio change (debounced 100 ms), dispose and rebuild the gear set, preserving the current rotation angles.

- [ ] **Step 6: Run tests and verify the ratio rebuild**

Run: `npm test && npm run dev`
Expected: tests PASS; moving the ratio slider rebuilds the teeth, and the 3D remains stable.

- [ ] **Step 7: Commit**

```bash
git add web/src/engine/harmonicGears.ts web/src/engine/harmonicGears.test.ts web/src/main.ts
git commit -m "feat(web): generate live 100/102 harmonic gears for any ratio"
```

---

### Task 7: Flexspline elliptical deformation and transmission animation

**Files:**
- Create: `web/src/engine/flexspline.ts`
- Create: `web/src/engine/flexspline.test.ts`
- Create: `web/src/engine/drive.ts`
- Create: `web/src/engine/drive.test.ts`
- Modify: `web/src/main.ts`
- Modify: `web/index.html`
- Modify: `web/src/style.css`

**Interfaces:**
- Consumes: `GearParams`, `buildGearSet`.
- Produces:
  - `falloff(z: number, rimZ: number, diaphragmZ: number): number` (1 at rim, 0 at diaphragm, smooth)
  - `deformRadius(r: number, theta: number, z: number, psi: number, module: number, rimZ: number, diaphragmZ: number): number`
  - `makeFlexMaterial(flex: THREE.Mesh, params: GearParams): THREE.ShaderMaterial`
  - `updateFlexUniforms(material, psi: number): void`
  - `class Drive { constructor(groups: { input: THREE.Object3D[]; output: THREE.Object3D[]; cage?: THREE.Object3D[]; flexMaterial?: THREE.ShaderMaterial }); setInputRpm(rpm: number); setRatio(ratio: number); update(dt: number): void; inputAngle: number; outputAngle: number; waveAngle: number; }`
  - `outputRpm(inputRpm: number, ratio: number): number`

- [ ] **Step 1: Write the failing tests**

`flexspline.test.ts`:
- `falloff(rimZ, rimZ, diaphragmZ) === 1`; `falloff(diaphragmZ, ...) === 0`; monotonic between.
- `deformRadius(23.525, 0, 73, 0, 0.5, 73, 84) === 24.025` (major axis); at `theta = Math.PI/2` → `23.025` (minor).
- `deformRadius(r, theta, diaphragmZ, psi, m, ...) === r` (diaphragm does not deform).

`drive.test.ts`:
- `outputRpm(1000, 50) === 20`; `outputRpm(0, 50) === 0`; `outputRpm(1000, 30) ≈ 33.333`.
- After `update(1)` with 1000 rpm and ratio 50, `waveAngle` advances by `2π * 1000/60 * 0.05` (visual scale 1/20), `outputAngle` advances by `-waveAngle/50`.

- [ ] **Step 2: Run to verify failure**

Run: `npm test`
Expected: FAIL with missing modules.

- [ ] **Step 3: Implement the deformation**

Use a `ShaderMaterial` on the FS meshes: `onBeforeCompile` of a `MeshStandardMaterial` is preferable so lighting stays consistent. In the vertex shader, compute `z`, `theta = atan(position.y, position.x)`, `f = smoothstep(diaphragmZ, rimZ, z)`, `delta = module * f * cos(2.0 * (theta - psi))`, and displace `position.xy` radially by `delta`. Pass `psi` and `module` uniforms. For normals, recompute an approximate normal in the shader (radial derivative) or use `flatShading` for the tooth band; the check is visual.

- [ ] **Step 4: Implement the drive groups**

Group the input parts (`Rotor_Hub`, magnets, sleeve, input encoder ring, WG cam/balls/race) and the output parts (`Flexspline_Cup`, output flange, CRB inner ring, output encoder ring). Rotate input groups by `+waveAngle`, output groups by `-waveAngle/ratio`. Update the FS uniform `psi = waveAngle - outputAngle` in the FS local frame. The CS, housing, stator, windings, output cap, and PCBs stay fixed. The CRB cage rotates at `outputAngle/2`.

- [ ] **Step 5: Add the transmission controls**

When `#btn-drive` is on: show `#drive-controls`; `#input-rpm` 0–3000 default 1000; `#ratio` 20–100 step 0.5 default 50; display `#output-rpm` = input/ratio. Update `Drive` every frame. Show “演示慢放 ×1/20”. Turning off stops and preserves angles; explosion >5% pauses.

- [ ] **Step 6: Verify in the browser**

Run: `npm test && npm run dev`
Expected: at 50:1 the WG spins fast and the output creeps backward; at 30:1 the output is faster; at 0 rpm everything stops; the FS teeth visibly mesh at the major axis and clear at the minor.

- [ ] **Step 7: Commit**

```bash
git add web/src/engine/flexspline.ts web/src/engine/flexspline.test.ts web/src/engine/drive.ts web/src/engine/drive.test.ts web/src/main.ts web/index.html web/src/style.css
git commit -m "feat(web): add elliptical flexspline deformation and live drive"
```

---

### Task 8: Two-dimensional section panel with live tooth inset

**Files:**
- Create: `web/src/engine/meshDiagram.ts`
- Create: `web/src/engine/meshDiagram.test.ts`
- Modify: `web/src/main.ts`
- Modify: `web/index.html`
- Modify: `web/src/style.css`

**Interfaces:**
- Consumes: `gearParams`, `Drive` state.
- Produces:
  - `toothRadii(ratio: number): { fsTip, fsRoot, csTip, csRoot }`
  - `class MeshDiagram { constructor(canvas: HTMLCanvasElement); setState(state: { ratio, waveAngle, outputAngle, inputRpm }); dispose(); }`

- [ ] **Step 1: Write the failing test**

`meshDiagram.test.ts` asserts `toothRadii(50)` equals the spec radii (FS tip 25.5, root 24.375, CS tip 25.0, root 26.125) and `toothRadii(20)` scales with module 1.25.

- [ ] **Step 2: Run to verify failure**

Run: `npm test`
Expected: FAIL with missing module.

- [ ] **Step 3: Implement the 2D inset**

Canvas 2D: draw the fixed CS ring (102 teeth), the FS ring at the current ratio with an elliptical radial displacement `δ = m cos(2(θ−ψ))`, the WG ellipse, and the 18 balls. Highlight the major-axis contact zone in copper and the minor-axis clearance in steel blue. Draw labels: `Zf = 100 · Zc = 102 · i = 50:1`, `长轴啮合`, `短轴脱开`. Use `devicePixelRatio` for crisp lines; animate with `requestAnimationFrame` only while the panel is open.

- [ ] **Step 4: Add the panel shell**

`#btn-diagram` opens `#diagram-panel` (full-screen overlay). It contains an `<img id="diagram-static" src="/assets/harmonic_actuator_section_teaching.svg">` fitted with `object-fit: contain`, and the live canvas at the lower-right. `#diagram-close`/Esc closes. While open, pause the 3D clock; pass the current `Drive` state to `MeshDiagram.setState` each frame. Include the note “齿部按安装变形状态示意；壳体外廓为严格投影”.

- [ ] **Step 5: Verify with screenshots**

Run `npm run dev` and `npm run check:visual`; inspect `ha-diagram.png`.
Expected: static section legible, live inset rotating and synchronized, labels correct, panel closes back to 3D.

- [ ] **Step 6: Commit**

```bash
git add web/src/engine/meshDiagram.ts web/src/engine/meshDiagram.test.ts web/src/main.ts web/index.html web/src/style.css
git commit -m "feat(web): add 2D section panel with live tooth mesh"
```

---

### Task 9: Mobile, keyboard, reduced motion, and visual-check script

**Files:**
- Modify: `web/src/style.css`
- Modify: `web/src/main.ts`
- Modify: `web/scripts/visual-check.mjs`

**Interfaces:**
- Consumes: all UI controls.
- Produces: responsive layout; keyboard map; `prefers-reduced-motion` behavior; six screenshots.

- [ ] **Step 1: Write the failing visual check**

`visual-check.mjs` launches `puppeteer-core` with `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`, opens `http://127.0.0.1:5173/`, waits for `#loading` hidden, and asserts:
- Canvas exists and has non-zero size.
- `#btn-reset`, `#explode`, `#btn-cut`, `#btn-drive`, `#btn-diagram` are visible.
- Set `#explode` to 100; screenshot `ha-explode.png`.
- Reset; click cut; screenshot `ha-cut.png`.
- Reset; click drive; read `#output-rpm` = `20` at 1000 rpm/50:1; screenshot `ha-drive-50.png`.
- Set ratio to 30; assert `#output-rpm` ≈ `33.3`; screenshot `ha-drive-30.png`.
- Click diagram; screenshot `ha-diagram.png`; Esc closes.
- Set viewport 390×844; reload; screenshot `ha-mobile.png`; assert the control bar is within the viewport and the canvas height > 300.
- Collect console errors; fail on any.

- [ ] **Step 2: Run to verify failure**

Start `npm run dev` in another terminal, then `npm run check:visual`.
Expected: FAIL because the script's selectors/behavior are not implemented yet.

- [ ] **Step 3: Implement responsive layout and keyboard**

CSS: desktop grid with canvas full-screen, top bar overlay, bottom control card; mobile `@media (max-width: 760px)`: bottom toolbar as a grid, part card as a bottom drawer, diagram panel full-screen. Keyboard: Tab cycles parts, Enter opens, Esc closes, arrows rotate the camera, `+`/`-` zoom, `R` resets. `prefers-reduced-motion`: disable auto-rotate, snap explode to 0/50/100, freeze the 2D inset, and stop the drive at the last frame.

- [ ] **Step 4: Run the visual check to verify pass**

Run: `npm run check:visual`
Expected: PASS; screenshots in `/tmp/ha-*.png`; mobile layout usable.

- [ ] **Step 5: Commit**

```bash
git add web/src/style.css web/src/main.ts web/scripts/visual-check.mjs
git commit -m "feat(web): responsive layout, keyboard, reduced motion, visual checks"
```

---

### Task 10: Performance, loading failure, and final build

**Files:**
- Modify: `web/src/main.ts`
- Modify: `web/src/style.css`
- Modify: `web/vite.config.ts`
- Create: `web/README.md`

**Interfaces:**
- Consumes: all prior tasks.
- Produces: production build; asset-size check; error state; README.

- [ ] **Step 1: Measure the GLB and page load**

Run: `ls -lh web/public/assets/harmonic_actuator_v2.glb`; `npm run build`; `npm run preview`.
Expected: record the GLB size. If > 6 MB, run `npx @gltf-transform/cli optimize web/public/assets/harmonic_actuator_v2.glb web/public/assets/harmonic_actuator_v2.glb --compress meshopt` and re-check; if still > 6 MB, reduce the CAD export tessellation (`linear_deflection` 0.05→0.1) and re-export. Do not change the manifest node names.

- [ ] **Step 2: Add the loading/error states**

The loading overlay shows a progress bar driven by the GLB `onProgress`; on failure, `#error` shows the error message and a “重试” button that reloads. Add a `webglcontextlost` listener that shows the same error panel.

- [ ] **Step 3: Verify production behavior**

Run: `npm run build && npm run preview`; open the preview URL; perform explode → cut → drive 30:1 → diagram → reset. Screenshot `ha-final.png`.
Expected: no console errors; 3D usable; controls responsive.

- [ ] **Step 4: Write `web/README.md`**

Document: `npm install`, `npm run dev`, `npm run build`, `npm test`, `npm run check:visual`; asset prerequisites from the CAD plan; the ratio/input-speed semantics; the “演示慢放” badge; the disclaimer copy; known limitations.

- [ ] **Step 5: Commit**

```bash
git add web/src/main.ts web/src/style.css web/vite.config.ts web/README.md web/public/assets
git commit -m "perf(web): optimize assets, add error states, document the app"
```

---

## Self-Review

- Spec coverage: §3 (Tasks 0–9), §4 (loader/manifest Task 2), §5 (Tasks 6–7), §6 (Task 5), §7 (Task 8), §8 (Tasks 0–10), §9 (Tasks 9–10), §10 (copy/constraints), §11 (error/loading/perf).
- Step scan: each step names a file, a signature, a test assertion, or a command; no TBD.
- Type consistency: `PartSpec`, `ActuatorManifest`, `LoadedActuator`, `GearParams`, `Drive`, `MeshDiagram` names match across tasks.
- Review Focus: each line has a test in Tasks 6, 7, 9, or 10 (ratio edges, deformation continuity, cut/ghost readability, mobile, load failure).
