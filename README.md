# Frameless BLDC Motor + Harmonic Drive Actuator CAD Package

## 1. Archive Contents

### Code Package (`harmonic_actuator_code.zip`)
- `harmonic_actuator_build123d.py`: Parametric CAD script using `build123d` (Builder mode) to construct the 9 core sub-assemblies (Thermal Cooling Housing, Frameless Stator & Windings, Carbon-Sleeved NdFeB Rotor & Hollow Shaft, Multi-Turn Absolute Encoder PCB & Magnetic Ring, RB7013 Cross Roller Bearing, Elliptical Wave Generator, Slotted Cup Flexspline, Rigid Circular Spline, and Stepped Output Flange) and export `.step` / `.stl` files.
- `generate_actuator_models.py`: Standalone pure-Python (`numpy` + `matplotlib`) parametric 3D mesh, multi-body `.obj`/`.mtl`, `.stl`, ISO-10303-21 `.step`, and 4-panel CAD engineering blueprint generator (runs without OpenCASCADE).
- `requirements.txt`: Python dependencies for both scripts.

### Assets Package (`harmonic_actuator_assets.zip`)
- `models/harmonic_actuator_assembly.step`: Multi-body ISO-10303-21 STEP 3D CAD assembly.
- `models/harmonic_actuator_cutaway.stl`: Watertight binary STL 3D cutaway model (24,828 triangles).
- `models/harmonic_actuator_assembly.obj`: Multi-body Wavefront OBJ 3D model with named sub-components.
- `models/harmonic_actuator_assembly.mtl`: Material color definitions for the OBJ assembly.
- `drawings/harmonic_actuator_cad_blueprint.png`: 4-panel CAD engineering blueprint (3D Quarter-Cutaway Render, 2D Axial Cross-Section, Harmonic Tooth Engagement Kinematics, and BOM Specification Table).
- `drawings/reference_actuator_cutaway.jpg`: Original reference cutaway diagram.

## 2. Quick Start

```bash
pip install -r requirements.txt

# Option A: Run native build123d B-Rep generator
python3 harmonic_actuator_build123d.py

# Option B: Run standalone NumPy mesh/STEP + blueprint generator
python3 generate_actuator_models.py
```
