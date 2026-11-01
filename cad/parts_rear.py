"""Rear-end parts: cover, input encoder, end bell, rear bearing."""

import math

import build123d as bd
from build123d import (
    Align,
    Box,
    BuildPart,
    Compound,
    Cylinder,
    Locations,
    Mode,
    PolarLocations,
    Sphere,
)

from cad.params import ActuatorParams

C = Align.CENTER
MIN = Align.MIN


def build_rear_cover(p: ActuatorParams) -> bd.Part:
    """Ø58 × 3 service cover with a Ø24 cable opening and 4×M3 holes."""
    with BuildPart() as cover:
        Cylinder(p.rear_cover_od / 2.0, 3.0, align=(C, C, MIN))
        Cylinder(p.rear_cover_hole_d / 2.0, 3.0, align=(C, C, MIN), mode=Mode.SUBTRACT)
        with Locations((0, 0, 0)):
            with PolarLocations(p.rear_cover_bolt_pcd / 2.0, p.rear_cover_bolt_count, start_angle=45.0):
                Cylinder(1.7, 3.0, align=(C, C, MIN), mode=Mode.SUBTRACT)
    part = cover.part
    part.label = "Rear_Cover"
    part.color = "#C4C9D1"
    return part


def build_input_encoder_pcb(p: ActuatorParams) -> bd.Part:
    """18 × 12 × 1.6 readhead board at R21, clear of the Ø24 cable bore."""
    with BuildPart() as pcb:
        with Locations((21.0, 0.0, 3.8)):
            Box(18.0, 12.0, 1.6)
    part = pcb.part
    part.label = "Input_Encoder_PCB"
    part.color = "#1F6B3A"
    return part


def build_input_encoder_ring(p: ActuatorParams) -> bd.Part:
    """Ø46 / Ø34 × 2 magnetic ring on the rotor rear face (Z 5.8–7.8)."""
    with BuildPart() as ring:
        with Locations((0, 0, 5.8)):
            Cylinder(23.0, 2.0, align=(C, C, MIN))
            Cylinder(17.0, 2.0, align=(C, C, MIN), mode=Mode.SUBTRACT)
    part = ring.part
    part.label = "Input_Encoder_Ring"
    part.color = "#5A5F68"
    return part


def build_rear_end_bell(p: ActuatorParams) -> bd.Part:
    """Ø110 rear end bell with a Ø42 bearing seat and a cover pocket.

    The bell is one solid: outer shell, rear flange, four cover-screw posts
    with radial ribs, a front web, and the bearing boss. The cavity between
    the cover and the web houses the input encoder PCB and ring.
    """
    with BuildPart() as bell:
        # Outer shell Z0–10
        Cylinder(55.0, 10.0, align=(C, C, MIN))
        # Ø58 cover pocket Z0–3
        Cylinder(29.0, 3.0, align=(C, C, MIN), mode=Mode.SUBTRACT)
        # Encoder cavity r12..40, Z3–9
        with Locations((0, 0, 3.0)):
            Cylinder(40.0, 6.0, align=(C, C, MIN), mode=Mode.SUBTRACT)
        # Central cable opening Ø24
        Cylinder(12.0, 17.0, align=(C, C, MIN), mode=Mode.SUBTRACT)
        # Front web r32..55 at Z9–10
        with Locations((0, 0, 9.0)):
            Cylinder(55.0, 1.0, align=(C, C, MIN))
            Cylinder(32.0, 1.0, align=(C, C, MIN), mode=Mode.SUBTRACT)
        # Bearing boss r21..33 at Z9–17; overlaps the web r32..33 so it fuses
        with Locations((0, 0, 9.0)):
            Cylinder(33.0, 8.0, align=(C, C, MIN))
            Cylinder(21.0, 8.0, align=(C, C, MIN), mode=Mode.SUBTRACT)
        # Four cover-screw posts at PCD50, clocked 45° away from the PCB
        with Locations((0, 0, 3.0)):
            with PolarLocations(25.0, 4, start_angle=45.0):
                Cylinder(2.0, 6.0, align=(C, C, MIN))
        # Radial ribs connect the posts to the outer shell
        with Locations((0, 0, 3.5)):
            with PolarLocations(33.5, 4, start_angle=45.0):
                Box(15.0, 4.0, 1.0, align=(C, C, C))
        # Tapped cover holes in the posts, Z3–6
        with Locations((0, 0, 3.0)):
            with PolarLocations(25.0, 4, start_angle=45.0):
                Cylinder(1.25, 3.0, align=(C, C, MIN), mode=Mode.SUBTRACT)
        # 8×M3 body holes on PCD100, Z0–10
        with Locations((0, 0, 0)):
            with PolarLocations(50.0, 8):
                Cylinder(1.7, 10.0, align=(C, C, MIN), mode=Mode.SUBTRACT)
    part = bell.part
    part.label = "Rear_End_Bell"
    part.color = "#C4C9D1"
    return part


def build_rear_bearing(p: ActuatorParams) -> Compound:
    """Simplified 6806 bearing: Ø42/Ø39 outer, Ø33/Ø30 inner, 10×Ø3 balls."""
    with BuildPart() as outer:
        with Locations((0, 0, 10.0)):
            Cylinder(21.0, 7.0, align=(C, C, MIN))
            Cylinder(19.5, 7.0, align=(C, C, MIN), mode=Mode.SUBTRACT)
    outer.part.label = "Rear_Bearing_Outer"
    outer.part.color = "#DCE1E8"

    with BuildPart() as inner:
        with Locations((0, 0, 10.0)):
            Cylinder(16.5, 7.0, align=(C, C, MIN))
            Cylinder(15.0, 7.0, align=(C, C, MIN), mode=Mode.SUBTRACT)
    inner.part.label = "Rear_Bearing_Inner"
    inner.part.color = "#DCE1E8"

    with BuildPart() as balls:
        for i in range(10):
            a = math.radians(i * 36.0)
            with Locations((18.0 * math.cos(a), 18.0 * math.sin(a), 13.5)):
                Sphere(1.5)
    balls.part.label = "Rear_Bearing_Balls"
    balls.part.color = "#DCE1E8"

    return Compound(
        label="Rear_Bearing_6806",
        children=[outer.part, inner.part, balls.part],
    )
