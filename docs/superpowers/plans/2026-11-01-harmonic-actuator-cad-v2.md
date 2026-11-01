# Harmonic Actuator CAD v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mechanically coherent build123d v2 model of the HA-110 harmonic joint actuator and export the GLB/STEP/STL, manifest JSON, and section SVGs the interactive page consumes.

**Architecture:** A small Python package under `cad/`: `params.py` holds the expert-approved dimensional constants; `parts.py` builds each labeled part; `assembly.py` composes parts into the neutral assembly and the cutaway; `checks.py` measures the built geometry with `cadgen.geometry`; `export_assets.py` writes the web assets; `drawings.py` writes the two section SVGs. The model runs in cadgen 0.8.1's Python environment, not the system Python (whose OCP install is broken).

**Tech Stack:** Python 3.13 in `cadgen +0.8.1 run`, build123d 0.13.0, NumPy, build123d's `ExportSVG`; plain `assert` checks (no pytest in the cadgen env).

**Spec:** `docs/superpowers/specs/2026-11-01-harmonic-actuator-explainer-design.md`

## Global Constraints

- Units mm; +Z is the actuator axis; the rear cover is at Z=0 and the output face at Z=122.
- Body Ø110; mounting flange Ø118; total length 122 ± 1 mm.
- Ø20 through-bore clear from Z=-1 to Z=123.
- 50:1 baseline: Zf=100, Zc=102, m=0.5, FS pitch radius 25.0 mm; working WG ellipse major Ø48.05 / minor Ø46.05; neutral WG major ≤Ø46.65.
- Part node names must match the spec exactly, e.g. `Body_Housing`, `Flexspline_Cup`, `Output_Cap_Mount_Flange`.
- Kinematic contacts excluded from static interference: FS teeth ↔ CS teeth, CRB rollers ↔ races, WG balls ↔ races, WG flexible race ↔ FS inner wall.
- Every blind hole is a one-direction cut; never use `Hole(depth=...)` in a thin wall (build123d drills ±depth).
- Run CAD modules from the project root as `cadgen +0.8.1 run -m cad.<module>` (e.g. `-m cad.checks`), so `import cad.params` works. Check scripts end with `if __name__ == "__main__": main()`.
- Materials/colors: housing/end bell `#7D838B`, output cap `#9AA0A8`, output flange `#D9E0E8`, stator `#474D57`, copper `#DB802E`, magnets `#3A3F47`, CFRP `#2A2D33`, steel/bearings `#DCE1E8`, PCB `#1F6B3A`, encoder ring `#5A5F68`.
- Commit after every task.

## Review Focus

- A part that must be a single solid comes out as multiple unfused solids (body, output flange, rear end bell, output cap).
- The Ø20 bore is blocked by the output-flange nose, FS hub, WG cam, or a misplaced bearing inner ring.
- The CRB or stator cannot be inserted because a shoulder, cap tube, or bore is smaller than the spec's insertion path.
- FS/CS tooth counts, pitch radii, or WG major/minor are inconsistent, so the 2D/viewer mesh contradicts the CAD.
- GLB export loses node names, labels, colors, or world positions, breaking the manifest-driven web app.

---

### Task 0: Initialize the CAD package and prove the environment

**Files:**
- Create: `cad/__init__.py`
- Create: `cad/params.py`
- Create: `cad/checks.py`
- Create: `.gitignore` (if absent)

**Interfaces:**
- Consumes: nothing.
- Produces: `ActuatorParams` frozen dataclass with every constant listed in §4.3/§4.4 of the spec; `DEFAULT = ActuatorParams()`; `cad/checks.py` runnable as a script.

- [ ] **Step 1: Initialize git and ignore generated caches**

```bash
cd /Users/wang/Documents/AI_design/harmonic_actuator_code
git init
printf '__pycache__/\n*.pyc\nweb/node_modules/\n' > .gitignore
```

Skip `git init` if `.git` already exists; append missing lines to `.gitignore` instead.

- [ ] **Step 2: Write the first failing check**

`cad/checks.py` starts with:

```python
from cad.params import DEFAULT

def check_params() -> None:
    p = DEFAULT
    assert p.body_od == 110.0
    assert p.mount_flange_od == 118.0
    assert p.total_length == 122.0
    assert p.z_cs == (60.0, 74.0)
    assert p.wg_major_d - p.wg_minor_d == 2.0
    print("PASS params")

if __name__ == "__main__":
    check_params()
```

- [ ] **Step 3: Run the check to verify it fails**

Run: `cadgen +0.8.1 run -m cad.checks`
Expected: FAIL with `ModuleNotFoundError: No module named 'cad.params'`.

- [ ] **Step 4: Implement `cad/params.py` with the exact constants**

Include: `body_od=110.0`, `mount_flange_od=118.0`, `total_length=122.0`, `bore_id=20.0`, all Z ranges from §4.3, motor stack from §4.4, harmonic constants (`module=0.5`, `zf=100`, `zc=102`, `fs_pitch_d=50.0`, `fs_tip_d=51.0`, `fs_root_d=48.75`, `fs_inner_d=47.05`, `cs_root_d=52.25`, `wg_major_d=48.05`, `wg_minor_d=46.05`, `wg_neutral_major_d=46.65`), bearing sizes (`input_bearing=(30,42,7)`, `crb=(70,100,13)`), encoders, output interface, mount pattern, fits. Use tuples for Z ranges.

- [ ] **Step 5: Run the check to verify it passes**

Run: `cadgen +0.8.1 run -m cad.checks`
Expected: `PASS params`.

- [ ] **Step 6: Commit**

```bash
git add cad/__init__.py cad/params.py cad/checks.py .gitignore
git commit -m "feat(cad): add actuator parameter baseline"
```

---

### Task 1: Rear cover, input encoder, rear end bell, rear bearing

**Files:**
- Create: `cad/parts_rear.py`
- Modify: `cad/checks.py`

**Interfaces:**
- Consumes: `ActuatorParams` from `cad.params`.
- Produces:
  - `build_rear_cover(p) -> Part`
  - `build_input_encoder_pcb(p) -> Part`
  - `build_input_encoder_ring(p) -> Part`
  - `build_rear_end_bell(p) -> Part`
  - `build_rear_bearing(p) -> Compound` with children labeled `Rear_Bearing_Outer`, `Rear_Bearing_Inner`, `Rear_Bearing_Balls`

- [ ] **Step 1: Write the failing checks**

Add `check_rear()` asserting:
- `build_rear_cover(DEFAULT).bounding_box().size` ≈ (58, 58, 3); one central Ø24 hole; label `Rear_Cover`.
- Input PCB bbox 18×12×1.6, centered at R20 from the axis; label `Input_Encoder_PCB`.
- Input ring is an annulus Ø46/Ø34×2 at Z 5.8–7.8; label `Input_Encoder_Ring`.
- Rear end bell bbox Ø110×17 (Z0–17, including the bearing boss); one solid; label `Rear_End_Bell`.
- Rear bearing outer bore/OD 42, inner bore 30, width 7 at Z10–17; outer ring Ø42/Ø39, inner ring Ø33/Ø30, balls Ø3 at pitch radius 18.

- [ ] **Step 2: Run the checks to verify they fail**

Run: `cadgen +0.8.1 run -m cad.checks`
Expected: FAIL with `ModuleNotFoundError: No module named 'cad.parts_rear'`.

- [ ] **Step 3: Implement the rear parts**

Build with `BuildPart` and explicit cylinders/boxes. The rear end bell is one solid: OD110, rear face Z0, front face Z17, a bearing boss at Z10–17 with a Ø42 H7 seat × 7 deep, a central through-opening Ø30, 4×M3 rear-cover holes on PCD50, 8×M3 body holes on PCD100 (one-direction cuts from the rear), a rear-cover pocket, and a cable opening Ø24. The rear bearing is a simplified three-ring Compound: outer ring Ø42/Ø39×7, inner ring Ø33/Ø30×7, 10 balls Ø3 at the pitch radius 18.

- [ ] **Step 4: Run the checks to verify they pass**

Run: `cadgen +0.8.1 run -m cad.checks`
Expected: all rear checks PASS.

- [ ] **Step 5: Commit**

```bash
git add cad/parts_rear.py cad/checks.py
git commit -m "feat(cad): add rear cover, end bell, input encoder, rear bearing"
```

---

### Task 2: Rotor hub, motor stack, front bearing

**Files:**
- Create: `cad/parts_motor.py`
- Modify: `cad/checks.py`

**Interfaces:**
- Consumes: `ActuatorParams`.
- Produces:
  - `build_rotor_hub(p) -> Part`
  - `build_stator_core(p) -> Part`
  - `build_windings(p) -> Part`
  - `build_rotor_magnets(p) -> Part`
  - `build_carbon_sleeve(p) -> Part`
  - `build_front_bearing(p) -> Compound`

- [ ] **Step 1: Write the failing checks**

- Rotor hub: Ø20 through-bore; Ø30 journals at Z10–17 and Z51–58; Ø58.2 yoke at Z20–46; one solid; label `Rotor_Hub`.
- Stator: OD92/ID68, Z20–46, 24 teeth; one solid; label `Frameless_Stator_Core`.
- Windings: 24 coils, envelope Z15–51, OD≤92/ID≥68; label `Copper_Stator_Windings`.
- Magnets: Ø64.2/Ø58.2, Z20–46, 20 poles; label `NdFeB_Rotor_Magnets`.
- Sleeve: Ø66.2/Ø64.2, Z20–46; label `Carbon_Fiber_Sleeve`.
- Air gap: `closest_points(stator, sleeve).distance == 0.9 ± 0.02`.
- Front bearing: 6806 at Z51–58, outer Ø42, inner Ø30.

- [ ] **Step 2: Run to verify failure**

Expected: `ModuleNotFoundError: cad.parts_motor`.

- [ ] **Step 3: Implement the motor parts**

Rotor hub: revolve a profile with the Ø20 bore; add the WG-end flange at Z61–73 with 6×M3 on PCD28. Stator: back-iron ring Ø92/Ø78 with 24 inward teeth to Ø68, Z20–46. Windings: 24 boxes at mid-radius 38.5, radial height 9.5, tangential width 5.8, Z15–51, with a 3.3 mm slot relief. Magnets: 20 boxes at R30.6, radial 3.0, tangential width 0.86 of the pole pitch. Sleeve: annulus Ø66.2/Ø64.2. Front bearing: same three-ring construction as the rear.

- [ ] **Step 4: Run to verify pass**

Run: `cadgen +0.8.1 run -m cad.checks`
Expected: motor checks PASS.

- [ ] **Step 5: Commit**

```bash
git add cad/parts_motor.py cad/checks.py
git commit -m "feat(cad): add rotor, stator, windings, magnets, sleeve, front bearing"
```

---

### Task 3: Body housing, circular spline seat, output boss

**Files:**
- Create: `cad/parts_body.py`
- Modify: `cad/checks.py`

**Interfaces:**
- Consumes: `ActuatorParams`.
- Produces: `build_body_housing(p) -> Part`; `build_output_cap(p) -> Part` (may live here or Task 5).

- [ ] **Step 1: Write the failing checks**

- Body housing is one solid; main body Ø110 and output boss Ø118 at Z106–112, Z 10–112.
- Rear opening Ø92 from Z10 to Z51; front web Ø42 bearing seat at Z51–58.
- CS bore Ø76 at Z60–74; CRB bore Ø100 at Z93–106.
- Output boss Ø118/ID102 at Z106–112; 8×M3 tapped holes PCD110 from the front; output encoder radial window 20×12 at Z108–111, R40.
- Material on the Ø20 axis is zero at every Z.

- [ ] **Step 2: Run to verify failure**

Expected: `ModuleNotFoundError: cad.parts_body`.

- [ ] **Step 3: Implement the body housing**

Build a revolve profile for the outer envelope (Ø110 body, Ø118 output boss) and subtract the internal bores. Add the front web and bearing seat, CS seat shoulder at Z60, CRB shoulder at Z93, output boss, encoder window, and all blind holes as explicit one-direction cylinders. Check `len(part.solids()) == 1`; fuse with `clean()` if needed.

- [ ] **Step 4: Run to verify pass**

Run: `cadgen +0.8.1 run -m cad.checks`
Expected: body checks PASS.

- [ ] **Step 5: Commit**

```bash
git add cad/parts_body.py cad/checks.py
git commit -m "feat(cad): add split body housing with bearing and CS seats"
```

---

### Task 4: Harmonic set — circular spline, flexspline, wave generator

**Files:**
- Create: `cad/parts_harmonic.py`
- Modify: `cad/checks.py`

**Interfaces:**
- Consumes: `ActuatorParams`.
- Produces:
  - `build_circular_spline(p) -> Part`
  - `build_flexspline(p) -> Part`
  - `build_wave_generator(p) -> Compound` with `Wave_Generator_Cam`, `Wave_Generator_Balls`, `Wave_Generator_Flexible_Race`.

- [ ] **Step 1: Write the failing checks**

- CS: OD76, bore root Ø52.25, 102 internal teeth, Z60–74; one solid; label `Circular_Spline_Ring`.
- FS: pitch Ø50, 100 external teeth, tip Ø51.0, root Ø48.75, wall 0.85, tooth band Z61–73, cup wall Z73–84, diaphragm Z82–87, hub Ø47/Ø30; label `Flexspline_Cup`.
- WG: race outer major Ø48.05/minor Ø46.05; race wall 1.0 (radial); ball pitch = race inner − 1.25; cam outer = ball pitch − 1.25; 18 balls Ø2.5; label each child.
- Tooth phase: at ψ=0 (major axis), the FS tooth center aligns with a CS tooth space; at ψ=90°, it aligns with a CS tooth center. Check with a 2D polygon intersection or sampled radial profiles at the pitch circles.
- Neutral WG major ≤Ø46.65; `closest_points(wg_race, fs_inner_wall).distance ≥0.2`.

- [ ] **Step 2: Run to verify failure**

Expected: `ModuleNotFoundError: cad.parts_harmonic`.

- [ ] **Step 3: Implement the harmonic set**

CS: annulus Ø76/Ø52.25 with 102 internal tooth slots, Z60–74. FS: cup profile (tooth band + 0.85 wall + diaphragm + hub) with 100 external teeth. WG: race outer ellipse = working major/minor; race inner = outer − 2×1.0; ball pitch = race inner − 1.25; cam outer = ball pitch − 1.25; 18 balls Ø2.5. Use the same tooth phase formula in both CS and FS: tooth centers at `2πk/Z`, CS tooth spaces offset by half a pitch, and the FS/CS initial phases set so tooth 0 at the major axis sits in a CS space. For the neutral CAD, scale the WG ellipse so its major is ≤Ø46.65.

- [ ] **Step 4: Run to verify pass**

Run: `cadgen +0.8.1 run -m cad.checks`
Expected: harmonic checks PASS.

- [ ] **Step 5: Commit**

```bash
git add cad/parts_harmonic.py cad/checks.py
git commit -m "feat(cad): add 100/102 harmonic set with neutral WG"
```

---

### Task 5: Output flange, CRB, output encoder, output cap

**Files:**
- Create: `cad/parts_output.py`
- Modify: `cad/checks.py`

**Interfaces:**
- Consumes: `ActuatorParams`.
- Produces:
  - `build_output_flange(p) -> Part`
  - `build_cross_roller_bearing(p) -> Compound` with `Cross_Roller_Outer_Race`, `Cross_Roller_Inner_Race`, `Cross_Roller_Cage`
  - `build_output_encoder_ring(p) -> Part`
  - `build_output_encoder_pcb(p) -> Part`
  - `build_output_cap(p) -> Part`

- [ ] **Step 1: Write the failing checks**

- Output flange: nose Ø48/Ø20 at Z87–93; hub Ø70 at Z93–106; collar Ø74 at Z106–110; face Ø82 at Z110–122 with pilot Ø42, 8×M5 PCD64 counterbores, 2×Ø4 dowels; one solid.
- CRB: RB7013 70×100×13 at Z93–106; V-groove races; rollers tangent to both races; outer ring one solid, inner ring one solid, cage/rollers one compound.
- Output flange vs CS overlap volume = 0.
- Output encoder ring Ø78/Ø74×4 at Z106–110; PCB 20×12×1.6 at R40, Z108–111.
- Output cap: flange Ø118, tube OD102/ID86, Z106–120; one solid; 8×M4 PCD96 customer holes, 8×M3 PCD110 cap holes with local bosses; CRB outer-ring retainer face at Z106.
- Parent bracket clearance: output cap tube ID86 ≥ output flange face Ø82 + 2 mm.

- [ ] **Step 2: Run to verify failure**

Expected: `ModuleNotFoundError: cad.parts_output`.

- [ ] **Step 3: Implement the output parts**

Output flange: revolve the nose/hub/collar/face profile with a Ø20 bore; add the 8×M5 counterbores and 2 dowels; add the 8×M3 FS-hub holes on PCD36 and 2×Ø3 dowel holes. CRB: V-groove outer/inner races, 36 rollers alternating ±45°, cage. Output cap: flange + tube, 8×M4 customer holes, 8×M3 cap holes with 8 local bosses at PCD110, encoder radial window, CRB retainer. Output encoder ring/PCB as simple annulus/box.

- [ ] **Step 4: Run to verify pass**

Run: `cadgen +0.8.1 run -m cad.checks`
Expected: output checks PASS.

- [ ] **Step 5: Commit**

```bash
git add cad/parts_output.py cad/checks.py
git commit -m "feat(cad): add output flange, CRB, output encoders, output cap"
```

---

### Task 6: Full assembly and geometry checks

**Files:**
- Create: `cad/assembly.py`
- Modify: `cad/checks.py`

**Interfaces:**
- Consumes: all builders from Tasks 1–5.
- Produces:
  - `build_assembly(p=DEFAULT) -> Compound`
  - `build_cutaway(p=DEFAULT) -> Compound`
  - `PART_LABELS: tuple[str, ...]`
  - `ROTATION_GROUPS: dict[str, str]` mapping each node to `static` / `input` / `output` / `half_speed`.

- [ ] **Step 1: Write the failing assembly checks**

- `build_assembly()` bbox ≤118.01 in X/Y and ≤122.01 in Z.
- Ø20 bore: intersect the assembly with a Ø20×124 cylinder from Z=-1; volume < 1 mm³.
- Every label in `PART_LABELS` appears exactly once in the assembly tree.
- Non-kinematic pairs: overlap volume 0 (tolerance 1e-3 mm³). Build the pair list from the spec's §4.7.
- Kinematic pairs: minimum distance 0 (tangent) and no overlap > 5 mm³ for rollers/balls; FS/CS static overlap is allowed and excluded.
- CRB insertion path: from Z122 inward, no feature smaller than Ø100 before Z93.
- Stator insertion path: from Z-1 inward to Z51, no feature smaller than Ø92.
- Output flange nose vs CS: `closest_points >= 2.0` (they are axially separated; this check proves it).
- FS hub vs output flange: distance 0 at Z87; FS hub vs CS: min distance ≥2.0.
- Each part that must be one solid has `len(part.solids()) == 1`: body, output flange, rear end bell, output cap, FS, CS, rotor hub, stator.

- [ ] **Step 2: Run to verify failure**

Expected: checks fail on missing `cad.assembly`.

- [ ] **Step 3: Implement `cad/assembly.py`**

Compose `Compound(label="HA_110_Actuator", children=[...])` with all parts in world coordinates. Define `PART_LABELS` and `ROTATION_GROUPS`. Apply no cutaway in `build_assembly`; `build_cutaway` subtracts the global 180° box and the 90° harmonic window from the body/CS/stator/windings only, leaving FS/WG/output flange untouched.

- [ ] **Step 4: Run to verify pass**

Run: `cadgen +0.8.1 run -m cad.checks`
Expected: all assembly checks PASS.

- [ ] **Step 5: Commit**

```bash
git add cad/assembly.py cad/checks.py
git commit -m "feat(cad): assemble full actuator and add geometry checks"
```

---

### Task 7: Export STEP, STL, GLB, manifest JSON

**Files:**
- Create: `cad/export_assets.py`
- Modify: `cad/assembly.py` (add `PART_SPECS` metadata)
- Create: `web/public/assets/` (directory)

**Interfaces:**
- Consumes: `build_assembly`, `build_cutaway`, `PART_LABELS`, `ROTATION_GROUPS`.
- Produces: `export_all(p=DEFAULT) -> dict[str, Path]`; writes `models/harmonic_actuator_v2_assembly.step`, `models/harmonic_actuator_v2_cutaway.step`, `models/harmonic_actuator_v2_cutaway.stl`, `models/harmonic_actuator_v2.glb`, `web/public/assets/harmonic_actuator.json`.

- [ ] **Step 1: Write the failing export checks**

- After `export_all()`, all five files exist and are non-empty.
- Parse the GLB JSON chunk; node names contain every `PART_LABELS` entry; material count ≥10; no mesh has 0 primitives.
- Manifest has 24 parts; each `node` matches a GLB node; `group` is one of the four rotation groups; `explode_offset` is a 3-vector; `explode_order` is a non-negative integer; `procedural` is true for the five harmonic nodes.
- Manifest ratio min/max/step/default = 20/100/0.5/50; input speed 0/3000/1000/0.05.

- [ ] **Step 2: Run to verify failure**

Expected: `FileNotFoundError` for the assets.

- [ ] **Step 3: Implement `export_assets.py` and `PART_SPECS`**

Use `export_step`, `export_stl`, `export_gltf(..., unit=Unit.M, binary=True)` so the GLB carries numeric millimetres with a Y-up root. Write the manifest with the exact explode offsets/orders from the spec's plan table, plus `gltf_up:"Y"` and `gltf_units:"mm"`:
- Output cap +Z80/order0; output encoder PCB +Z60/1; ring +Z55/1; cage +Z50/2; outer race +Z48/2; inner race +Z42/2; output flange +Z35/3; CS +Z28/4; FS +Z20/5; WG cam/balls/race +Z12/5; front bearing -Z10/6; stator -Z20/7; windings -Z25/7; rotor hub -Z35/8; magnets -Z40/8; sleeve -Z45/8; rear bearing -Z50/9; rear end bell -Z60/9; input ring -Z65/10; input PCB -Z70/10; rear cover -Z75/10; body 0/0.

Mark `Flexspline_Cup`, `Circular_Spline_Ring`, `Wave_Generator_Cam`, `Wave_Generator_Balls`, `Wave_Generator_Flexible_Race` as `procedural: true`. Mark `cut: true` for body/stator/windings/CS/rear bell/rear cover/output cap; `ghost_in_transmission: true` for body/stator/windings/CS/output cap.

- [ ] **Step 4: Run to verify pass**

Run: `cadgen +0.8.1 run -m cad.export_assets && cadgen +0.8.1 run -m cad.checks`
Expected: all assets written and checks PASS; GLB node names verified.

- [ ] **Step 5: Commit**

```bash
git add cad/export_assets.py cad/assembly.py models web/public/assets
git commit -m "feat(cad): export v2 STEP/STL/GLB and web manifest"
```

---

### Task 8: Two-dimensional section SVGs

**Files:**
- Create: `cad/drawings.py`
- Modify: `cad/export_assets.py`

**Interfaces:**
- Consumes: `ActuatorParams`, the section geometry from `build_assembly`.
- Produces: `drawings/harmonic_actuator_section_teaching.svg`, `drawings/harmonic_actuator_section_neutral.svg`, and a copy of the teaching SVG at `web/public/assets/harmonic_actuator_section_teaching.svg`; `draw_sections(p=DEFAULT) -> tuple[Path, Path]`.

- [ ] **Step 1: Write the failing checks**

- Both SVGs exist and contain the strings `HA-110`, `Ø110`, `Ø118`, `Ø20`, `50:1`, `Zf=100`, `Zc=102`.
- Teaching SVG contains `长轴啮合`, `短轴脱开`, `扭矩路径`, `反力路径`, and a note that the gear mesh is shown in the installed/deformed state.
- Neutral SVG does not contain the teaching note; it shows the round FS and neutral WG.
- The SVG coordinate mapping uses mm and keeps the full section within the viewBox.

- [ ] **Step 2: Run to verify failure**

Expected: files missing.

- [ ] **Step 3: Implement `drawings.py`**

Project the body/rotor/output section at X=0 with build123d's `section`/`ExportSVG` (or a manual 2D projection of the section edges). Draw the teaching FS as an ellipse at the major axis: FS pitch 25.5, tooth tips 26.0, CS root 26.125; CS fixed; WG ellipse Ø48.05/Ø46.05. Draw the neutral FS as a circle Ø50 pitch; neutral WG ellipse Ø46.65/Ø44.65. Add labels, dimension chains, torque/reaction arrows, and a title block. Use the light industrial palette (`#1F2328` lines, `#C2652A` torque, `#5B6B7A` reaction, `#FFFFFF` paper). Copy the teaching SVG to `web/public/assets/harmonic_actuator_section_teaching.svg`.

- [ ] **Step 4: Run to verify pass**

Run: `cadgen +0.8.1 run -m cad.drawings && cadgen +0.8.1 run -m cad.checks`
Expected: both SVGs written; string checks PASS.

- [ ] **Step 5: Commit**

```bash
git add cad/drawings.py cad/export_assets.py drawings
git commit -m "feat(cad): add teaching and neutral section drawings"
```

---

### Task 9: Fix the legacy blocking issues and update README

**Files:**
- Modify: `generate_actuator_models.py`
- Modify: `README.md`

**Interfaces:**
- Consumes: nothing.
- Produces: legacy scripts that run without the `/working_dir` crash; README points to the v2 pipeline.

- [ ] **Step 1: Write the failing check**

Run `python3 generate_actuator_models.py`; expected to fail with `OSError: Read-only file system: '/working_dir'`.

- [ ] **Step 2: Replace the hardcoded output path**

Set `OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "legacy_output")` and create it. Do not change the generated geometry.

- [ ] **Step 3: Mark the hand-written STEP as deprecated**

In `write_iso_step_file`, add a docstring/print that the file is a surface-only faceted export and is not the v2 STEP; or remove the call from `__main__` and print a pointer to `cad/export_assets.py`. Do not claim it is a valid solid STEP.

- [ ] **Step 4: Update README**

Add a "v2 pipeline" section: `cad/` + `web/`; commands `cadgen +0.8.1 run -m cad.export_assets`, `cd web && npm install && npm run dev`; list the new assets; mark the old scripts as legacy templates.

- [ ] **Step 5: Run the legacy script and the CAD checks**

Run: `python3 generate_actuator_models.py && cadgen +0.8.1 run -m cad.checks`
Expected: legacy assets write to `legacy_output/`; v2 checks PASS.

- [ ] **Step 6: Commit**

```bash
git add generate_actuator_models.py README.md
git commit -m "fix: make legacy generator path-safe and document v2 pipeline"
```

---


## Post-review fixes (v2.1)

The independent CAD review found four Critical and eight Important issues. All were fixed and re-exported; the final `cadgen +0.8.1 run -m cad.checks` prints all PASS.

- **C1 GLB frame/unit:** `export_gltf(..., unit=Unit.M)` keeps numeric millimetres; the GLB root is Y-up. The manifest adds `gltf_up:"Y"`/`gltf_units:"mm"`; the web plan converts offsets/procedural Z stations with `(x,y,z)→(x,z,-y)`. `check_assets` asserts POSITION bounds > 60, the Y-up root quaternion, and the web GLB byte equality.
- **C2 rear cover screws:** `rear_cover_bolt_pcd` is 50 mm, matching the end-bell posts; `check_rear` verifies a screw passes the cover and engages the bell.
- **C3 FS–output joint:** FS hub holes are M3 clearance (r1.7), output-flange nose holes are M3 tap cores (r1.25), so the 8 screws enter from the FS side before the FS is inserted. FS hub bore is Ø32, clearing the cam bolt socket. Spec §4.9 assembly order is reordered (cam first, then bench FS+flange).
- **C4 stator–windings:** the 24 coils sit in the slots (slot sides r34–38.8, end turns Z15–20/46–51 outside the core); copper-in-iron overlap is 0; the stator–windings pair is back in the zero-overlap sweep.
- **I1 CRB inner retention:** output flange has a rotating Z92–93 shoulder (r35–41); the body is relieved to r42; the inner ring is supported by the rotating part and clears the static body by 1.0 mm. The model keeps the simplified inner OD82 (catalog Ø84.8; cap clearance 2.0 vs 0.6) documented in the spec/risks.
- **I2 bearing child rotation:** `Rear_Bearing_Inner`/`Front_Bearing_Inner` are `input`, their balls `half_speed`, via manifest `child_groups`; the outer rings stay static.
- **I3 rear cover cut:** `Rear_Cover` is `cut:true`; `check_assets` asserts the exact cut/ghost sets.
- **I4 phase check:** the 90° wedge is tangential (0.2 radial × 4 tangential); a mathematical phase check plus a one-tooth negative control were added.
- **I5 Ø44 spigot:** output flange has the male spigot ring at Z85–87; the FS hub has the matching recess; `check_output`/`check_harmonic` verify it.
- **I6 pilot interface:** the shell's output pilot is a Ø42 H7 recess; the customer part is the Ø42 h6 male spigot; spec §4.3/§4.7 updated.
- **I7 checks:** added GLB numeric/root/web-hash, cut/ghost/child-group flags, cover/bell, FS/flange, bell/body, cap/body, cam/rotor screw paths, CRB rotating/static support, WG child contacts, FS–CS bound, cutaway untouched volumes, duplicate names/empty meshes.
- **I8 exclusions:** only FS–CS and WG race–FS are excluded broadly; stator–windings is included again; WG cam/balls vs FS are checked; FS–CS neutral overlap is bounded at 250 mm³; CRB cage–race tolerance is 1 mm³.
- **Deferred minors:** CRB V-groove is a visual placeholder (not 45°); inner OD82/cap2.0 simplification; M4/M5 hole diameters mix clearance/tap conventions; CS root 26.15 vs 26.125; CAD rectangular tooth slots vs viewer trapezoids; 2D SVGs are schematic half-sections; output-cap local M3 bosses omitted; GLB ~11.9 MB optimization deferred to web Task 10; `Cross_Roller_Cage` is roller-only; drawing viewBox/geometry check is string-level.

## Self-Review

- Spec coverage: §4.1–4.10 (Tasks 1–8), §5.1–5.5 (Task 4 constants + web plan), §6 (Task 6 cutaway), §7 (Task 8), §8 (Tasks 0, 7), §9.1 (Tasks 6–8), §10 (defaults in params/export), §11 (checks/risks documented).
- Step scan: each step names one file, one signature, or one command; no TBD.
- Type consistency: `ActuatorParams` fields match the builders; `PART_LABELS` match the spec's node names; export manifest keys match the web plan's `PartSpec`.
- Review Focus: each line has a check in Tasks 3, 5, 6, or 7.
