"""Motor parts: rotor hub, stator, windings, magnets, sleeve, front bearing."""

import math

import build123d as bd
from build123d import (
    Align,
    Axis,
    Box,
    BuildLine,
    BuildPart,
    BuildSketch,
    Compound,
    Cylinder,
    Locations,
    Mode,
    Plane,
    PolarLocations,
    Polyline,
    Sphere,
    make_face,
    revolve,
)

from cad.params import ActuatorParams

C = Align.CENTER
MIN = Align.MIN


def build_rotor_hub(p: ActuatorParams) -> bd.Part:
    """Hollow rotor hub: Ø20 bore, Ø30 journals, Ø58.2 yoke, WG flange."""
    with BuildPart() as hub:
        with BuildSketch(Plane.XZ):
            with BuildLine():
                Polyline(
                    (10.0, 5.8),
                    (17.0, 5.8),
                    (17.0, 7.8),
                    (23.0, 7.8),
                    (23.0, 9.5),
                    (15.0, 9.5),
                    (15.0, 20.0),
                    (29.1, 20.0),
                    (29.1, 46.0),
                    (15.0, 46.0),
                    (15.0, 51.0),
                    (15.0, 58.0),
                    (18.0, 58.0),
                    (18.0, 61.0),
                    (10.0, 61.0),
                    close=True,
                )
            make_face()
        revolve(axis=Axis.Z)
        # 6×M3 WG-cam bolts on PCD28, from the front flange face
        with Locations((0, 0, 58.0)):
            with PolarLocations(14.0, 6):
                Cylinder(1.25, 3.0, align=(C, C, MIN), mode=Mode.SUBTRACT)
    part = hub.part
    part.label = "Rotor_Hub"
    part.color = "#8A9099"
    return part


def build_stator_core(p: ActuatorParams) -> bd.Part:
    """Ø92/Ø78 back iron with 24 inward teeth to Ø68, Z20–46."""
    with BuildPart() as core:
        with Locations((0, 0, 20.0)):
            Cylinder(p.stator_od / 2.0, p.stator_core_len, align=(C, C, MIN))
            Cylinder(39.0, p.stator_core_len, align=(C, C, MIN), mode=Mode.SUBTRACT)
            with PolarLocations(36.5, p.stator_slots):
                Box(5.0, 3.2, p.stator_core_len, align=(C, C, MIN))
    part = core.part
    part.label = "Frameless_Stator_Core"
    part.color = "#474D57"
    return part


def build_windings(p: ActuatorParams) -> bd.Part:
    """24 concentrated copper coils, Z15–51, with a central slot relief."""
    with BuildPart() as windings:
        with Locations((0, 0, 15.0)):
            with PolarLocations(38.75, p.stator_slots):
                Box(9.5, 5.8, 36.0, align=(C, C, MIN))
        with Locations((0, 0, 20.0)):
            with PolarLocations(38.75, p.stator_slots):
                Box(7.1, 3.3, 26.0, align=(C, C, MIN), mode=Mode.SUBTRACT)
    part = windings.part
    part.label = "Copper_Stator_Windings"
    part.color = "#DB802E"
    return part


def build_rotor_magnets(p: ActuatorParams) -> bd.Part:
    """20-pole NdFeB ring, Ø64.2/Ø58.2, Z20–46, with 20 pole gaps."""
    with BuildPart() as magnets:
        with Locations((0, 0, 20.0)):
            Cylinder(32.1, 26.0, align=(C, C, MIN))
            Cylinder(29.1, 26.0, align=(C, C, MIN), mode=Mode.SUBTRACT)
        with Locations((0, 0, 20.0)):
            with PolarLocations(30.6, p.magnet_poles, start_angle=9.0):
                Box(4.0, 1.35, 26.0, align=(C, C, MIN), mode=Mode.SUBTRACT)
    part = magnets.part
    part.label = "NdFeB_Rotor_Magnets"
    part.color = "#3A3F47"
    return part


def build_carbon_sleeve(p: ActuatorParams) -> bd.Part:
    """1.0 mm CFRP retention sleeve, Ø66.2/Ø64.2, Z20–46."""
    with BuildPart() as sleeve:
        with Locations((0, 0, 20.0)):
            Cylinder(33.1, 26.0, align=(C, C, MIN))
            Cylinder(32.1, 26.0, align=(C, C, MIN), mode=Mode.SUBTRACT)
    part = sleeve.part
    part.label = "Carbon_Fiber_Sleeve"
    part.color = "#2A2D33"
    return part


def _bearing_6806(z0: float, prefix: str) -> Compound:
    with BuildPart() as outer:
        with Locations((0, 0, z0)):
            Cylinder(21.0, 7.0, align=(C, C, MIN))
            Cylinder(19.5, 7.0, align=(C, C, MIN), mode=Mode.SUBTRACT)
    outer.part.label = f"{prefix}_Outer"
    outer.part.color = "#DCE1E8"

    with BuildPart() as inner:
        with Locations((0, 0, z0)):
            Cylinder(16.5, 7.0, align=(C, C, MIN))
            Cylinder(15.0, 7.0, align=(C, C, MIN), mode=Mode.SUBTRACT)
    inner.part.label = f"{prefix}_Inner"
    inner.part.color = "#DCE1E8"

    with BuildPart() as balls:
        for i in range(10):
            a = math.radians(i * 36.0)
            with Locations((18.0 * math.cos(a), 18.0 * math.sin(a), z0 + 3.5)):
                Sphere(1.5)
    balls.part.label = f"{prefix}_Balls"
    balls.part.color = "#DCE1E8"

    return Compound(
        label=f"{prefix}_6806",
        children=[outer.part, inner.part, balls.part],
    )


def build_front_bearing(p: ActuatorParams) -> Compound:
    return _bearing_6806(51.0, "Front_Bearing")
