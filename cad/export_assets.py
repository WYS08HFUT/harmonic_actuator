"""Export HA-110 STEP/STL/GLB plus the web manifest."""

import json
import shutil
import struct
from pathlib import Path

from build123d import export_gltf, export_step, export_stl

from cad.assembly import PART_LABELS, PART_SPECS, build_assembly, build_cutaway
from cad.drawings import draw_sections
from cad.params import DEFAULT, ActuatorParams

ROOT = Path(__file__).resolve().parents[1]
MODELS = ROOT / "models"
WEB_ASSETS = ROOT / "web" / "public" / "assets"

ASSEMBLY_STEP = MODELS / "harmonic_actuator_v2_assembly.step"
CUTAWAY_STEP = MODELS / "harmonic_actuator_v2_cutaway.step"
CUTAWAY_STL = MODELS / "harmonic_actuator_v2_cutaway.stl"
GLB = MODELS / "harmonic_actuator_v2.glb"
WEB_GLB = WEB_ASSETS / "harmonic_actuator_v2.glb"
MANIFEST = WEB_ASSETS / "harmonic_actuator.json"


def _glb_names(path: Path) -> set[str]:
    with path.open("rb") as f:
        magic, version, _ = struct.unpack("<4sII", f.read(12))
        assert magic == b"glTF" and version == 2
        chunk_len, chunk_type = struct.unpack("<II", f.read(8))
        assert chunk_type == 0x4E4F534A
        data = json.loads(f.read(chunk_len))
    return {node.get("name") for node in data.get("nodes", [])}


def export_all(p: ActuatorParams = DEFAULT) -> dict[str, Path]:
    MODELS.mkdir(parents=True, exist_ok=True)
    WEB_ASSETS.mkdir(parents=True, exist_ok=True)

    assy = build_assembly(p)
    cut = build_cutaway(p)

    export_step(assy, ASSEMBLY_STEP)
    export_step(cut, CUTAWAY_STEP)
    export_stl(cut, CUTAWAY_STL)
    export_gltf(assy, GLB, binary=True)
    shutil.copyfile(GLB, WEB_GLB)

    names = _glb_names(GLB)
    missing = [label for label in PART_LABELS if label not in names]
    assert not missing, f"GLB missing nodes: {missing}"

    manifest = {
        "id": "ha-110",
        "title": "谐波关节模组 HA-110",
        "units": "mm",
        "axis": "Z",
        "parts": list(PART_SPECS),
        "ratio": {"min": 20, "max": 100, "step": 0.5, "default": 50},
        "input_speed": {"min": 0, "max": 3000, "default": 1000, "visual_scale": 0.05},
    }
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    draw_sections(p)

    paths = {
        "assembly_step": ASSEMBLY_STEP,
        "cutaway_step": CUTAWAY_STEP,
        "cutaway_stl": CUTAWAY_STL,
        "glb": GLB,
        "web_glb": WEB_GLB,
        "manifest": MANIFEST,
    }
    for key, path in paths.items():
        print(f"{key}: {path} ({path.stat().st_size / 1024:.1f} KB)")
    return paths


if __name__ == "__main__":
    export_all()
