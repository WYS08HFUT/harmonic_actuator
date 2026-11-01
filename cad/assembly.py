"""Full HA-110 assembly, cutaway, and manifest-facing part metadata."""

import build123d as bd
from build123d import Align, Box, Compound, Location

from cad.params import DEFAULT, ActuatorParams
from cad.parts_body import build_body_housing
from cad.parts_harmonic import (
    build_circular_spline,
    build_flexspline,
    build_wave_generator,
)
from cad.parts_motor import (
    build_carbon_sleeve,
    build_front_bearing,
    build_rotor_hub,
    build_rotor_magnets,
    build_stator_core,
    build_windings,
)
from cad.parts_output import (
    build_cross_roller_bearing,
    build_output_cap,
    build_output_encoder_pcb,
    build_output_encoder_ring,
    build_output_flange,
)
from cad.parts_rear import (
    build_input_encoder_pcb,
    build_input_encoder_ring,
    build_rear_bearing,
    build_rear_cover,
    build_rear_end_bell,
)

C = Align.CENTER
MIN = Align.MIN

PART_LABELS: tuple[str, ...] = (
    "Rear_Cover",
    "Input_Encoder_PCB",
    "Input_Encoder_Ring",
    "Rear_End_Bell",
    "Rear_Bearing_6806",
    "Rotor_Hub",
    "Frameless_Stator_Core",
    "Copper_Stator_Windings",
    "NdFeB_Rotor_Magnets",
    "Carbon_Fiber_Sleeve",
    "Front_Bearing_6806",
    "Body_Housing",
    "Circular_Spline_Ring",
    "Flexspline_Cup",
    "Wave_Generator_Cam",
    "Wave_Generator_Balls",
    "Wave_Generator_Flexible_Race",
    "Cross_Roller_Outer_Race",
    "Cross_Roller_Inner_Race",
    "Cross_Roller_Cage",
    "Output_Flange",
    "Output_Encoder_Ring",
    "Output_Encoder_PCB",
    "Output_Cap_Mount_Flange",
)

ROTATION_GROUPS: dict[str, str] = {
    "Rear_Cover": "static",
    "Input_Encoder_PCB": "static",
    "Input_Encoder_Ring": "input",
    "Rear_End_Bell": "static",
    "Rear_Bearing_6806": "static",
    "Rotor_Hub": "input",
    "Frameless_Stator_Core": "static",
    "Copper_Stator_Windings": "static",
    "NdFeB_Rotor_Magnets": "input",
    "Carbon_Fiber_Sleeve": "input",
    "Front_Bearing_6806": "static",
    "Body_Housing": "static",
    "Circular_Spline_Ring": "static",
    "Flexspline_Cup": "output",
    "Wave_Generator_Cam": "input",
    "Wave_Generator_Balls": "input",
    "Wave_Generator_Flexible_Race": "input",
    "Cross_Roller_Outer_Race": "static",
    "Cross_Roller_Inner_Race": "output",
    "Cross_Roller_Cage": "half_speed",
    "Output_Flange": "output",
    "Output_Encoder_Ring": "output",
    "Output_Encoder_PCB": "static",
    "Output_Cap_Mount_Flange": "static",
}


def _spec(
    node: str,
    z_offset: float,
    order: int,
    *,
    cut: bool = False,
    ghost: bool = False,
    procedural: bool = False,
    teaching: str | None = None,
) -> dict:
    return {
        "node": node,
        "group": ROTATION_GROUPS[node],
        "explode_offset": [0.0, 0.0, float(z_offset)],
        "explode_order": order,
        "cut": cut,
        "ghost_in_transmission": ghost,
        "procedural": procedural,
        "teaching": teaching or node.lower(),
    }


PART_SPECS: tuple[dict, ...] = (
    _spec("Rear_Cover", -75.0, 10, teaching="rear_cover"),
    _spec("Input_Encoder_PCB", -70.0, 10, teaching="input_encoder_pcb"),
    _spec("Input_Encoder_Ring", -65.0, 10, teaching="input_encoder_ring"),
    _spec("Rear_End_Bell", -60.0, 9, cut=True, teaching="rear_end_bell"),
    _spec("Rear_Bearing_6806", -50.0, 9, teaching="rear_bearing"),
    _spec("Rotor_Hub", -35.0, 8, teaching="rotor"),
    _spec("Frameless_Stator_Core", -20.0, 7, cut=True, ghost=True, teaching="stator"),
    _spec("Copper_Stator_Windings", -25.0, 7, cut=True, ghost=True, teaching="windings"),
    _spec("NdFeB_Rotor_Magnets", -40.0, 8, teaching="magnets"),
    _spec("Carbon_Fiber_Sleeve", -45.0, 8, teaching="sleeve"),
    _spec("Front_Bearing_6806", -10.0, 6, teaching="front_bearing"),
    _spec("Body_Housing", 0.0, 0, cut=True, ghost=True, teaching="body"),
    _spec("Circular_Spline_Ring", 28.0, 4, cut=True, ghost=True, procedural=True, teaching="cs"),
    _spec("Flexspline_Cup", 20.0, 5, procedural=True, teaching="fs"),
    _spec("Wave_Generator_Cam", 12.0, 5, procedural=True, teaching="wg_cam"),
    _spec("Wave_Generator_Balls", 12.0, 5, procedural=True, teaching="wg_balls"),
    _spec("Wave_Generator_Flexible_Race", 12.0, 5, procedural=True, teaching="wg_race"),
    _spec("Cross_Roller_Outer_Race", 48.0, 2, teaching="crb_outer"),
    _spec("Cross_Roller_Inner_Race", 42.0, 2, teaching="crb_inner"),
    _spec("Cross_Roller_Cage", 50.0, 2, teaching="crb_cage"),
    _spec("Output_Flange", 35.0, 3, teaching="output_flange"),
    _spec("Output_Encoder_Ring", 55.0, 1, teaching="output_encoder_ring"),
    _spec("Output_Encoder_PCB", 60.0, 1, teaching="output_encoder_pcb"),
    _spec("Output_Cap_Mount_Flange", 80.0, 0, cut=True, ghost=True, teaching="output_cap"),
)


def build_assembly(p: ActuatorParams = DEFAULT) -> Compound:
    """Compose the full neutral-state actuator in world coordinates."""
    return Compound(
        label="HA_110_Actuator",
        children=[
            build_rear_cover(p),
            build_input_encoder_pcb(p),
            build_input_encoder_ring(p),
            build_rear_end_bell(p),
            build_rear_bearing(p),
            build_rotor_hub(p),
            build_stator_core(p),
            build_windings(p),
            build_rotor_magnets(p),
            build_carbon_sleeve(p),
            build_front_bearing(p),
            build_body_housing(p),
            build_circular_spline(p),
            build_flexspline(p),
            build_wave_generator(p),
            build_cross_roller_bearing(p),
            build_output_flange(p),
            build_output_encoder_ring(p),
            build_output_encoder_pcb(p),
            build_output_cap(p),
        ],
    )


def build_cutaway(p: ActuatorParams = DEFAULT) -> Compound:
    """Cutaway: 180° body/stator/windings/CS plus a 90° harmonic window."""
    assy = build_assembly(p)
    top = {child.label: child for child in assy.children}

    cut_global = Box(120.0, 240.0, 150.0, align=(MIN, C, MIN)).moved(
        Location((0.0, 0.0, -10.0))
    )
    cut_window = Box(85.0, 60.0, 27.0, align=(C, MIN, MIN)).moved(
        Location((0.0, 0.0, 60.0))
    )
    for label in (
        "Body_Housing",
        "Frameless_Stator_Core",
        "Copper_Stator_Windings",
        "Circular_Spline_Ring",
    ):
        cut = top[label] - cut_global - cut_window
        cut.label = label
        top[label] = cut

    return Compound(
        label="HA_110_Actuator_Cutaway",
        children=[top[child.label] for child in assy.children],
    )
