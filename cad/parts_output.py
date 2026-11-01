"""Output parts: flange, cross-roller bearing, output encoder, output cap."""

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
    Pos,
    Rot,
    make_face,
    revolve,
)

from cad.params import ActuatorParams

C = Align.CENTER
MIN = Align.MIN


def build_output_flange(p: ActuatorParams) -> bd.Part:
    """Output flange / CRB inner-race seat, Z87–122."""
    with BuildPart() as of:
        with BuildSketch(Plane.XZ):
            with BuildLine():
                Polyline(
                    (22.0, 85.0),
                    (23.5, 85.0),
                    (23.5, 87.0),
                    (24.0, 87.0),
                    (24.0, 92.0),
                    (41.0, 92.0),
                    (41.0, 93.0),
                    (35.0, 93.0),
                    (35.0, 106.0),
                    (37.0, 106.0),
                    (37.0, 110.0),
                    (41.0, 110.0),
                    (41.0, 122.0),
                    (21.0, 122.0),
                    (21.0, 118.0),
                    (10.0, 118.0),
                    (10.0, 87.0),
                    (22.0, 87.0),
                    close=True,
                )
            make_face()
        revolve(axis=Axis.Z)
        # 8×M3 FS-hub bolts: nose is tapped; screws enter from the FS side
        with Locations((0, 0, 87.0)):
            with PolarLocations(18.0, 8):
                Cylinder(1.25, 6.0, align=(C, C, MIN), mode=Mode.SUBTRACT)
        # 2×Ø3 dowels between the FS bolts
        with Locations((0, 0, 87.0)):
            with PolarLocations(18.0, 2, start_angle=22.5):
                Cylinder(1.5, 6.0, align=(C, C, MIN), mode=Mode.SUBTRACT)
        # 8×M5 through holes and counterbores on PCD64
        with Locations((0, 0, 110.0)):
            with PolarLocations(32.0, 8):
                Cylinder(2.6, 12.0, align=(C, C, MIN), mode=Mode.SUBTRACT)
        with Locations((0, 0, 117.5)):
            with PolarLocations(32.0, 8):
                Cylinder(4.8, 4.5, align=(C, C, MIN), mode=Mode.SUBTRACT)
        # 2×Ø4 dowels on PCD64, between the M5 holes
        with Locations((0, 0, 110.0)):
            with PolarLocations(32.0, 2, start_angle=22.5):
                Cylinder(2.0, 12.0, align=(C, C, MIN), mode=Mode.SUBTRACT)
    part = of.part
    part.label = "Output_Flange"
    part.color = "#D9E0E8"
    return part


def build_cross_roller_bearing(p: ActuatorParams) -> Compound:
    """Simplified RB7013: V-groove races and 36 alternating ±45° rollers."""
    with BuildPart() as outer:
        with BuildSketch(Plane.XZ):
            with BuildLine():
                Polyline(
                    (44.0, 93.0),
                    (50.0, 93.0),
                    (50.0, 106.0),
                    (44.0, 106.0),
                    (44.0, 103.0),
                    (45.0, 99.5),
                    (44.0, 96.0),
                    close=True,
                )
            make_face()
        revolve(axis=Axis.Z)
    outer.part.label = "Cross_Roller_Outer_Race"
    outer.part.color = "#DCE1E8"

    with BuildPart() as inner:
        with BuildSketch(Plane.XZ):
            with BuildLine():
                Polyline(
                    (35.0, 93.0),
                    (41.0, 93.0),
                    (41.0, 96.0),
                    (40.0, 99.5),
                    (41.0, 103.0),
                    (41.0, 106.0),
                    (35.0, 106.0),
                    close=True,
                )
            make_face()
        revolve(axis=Axis.Z)
    inner.part.label = "Cross_Roller_Inner_Race"
    inner.part.color = "#DCE1E8"

    with BuildPart() as cage:
        for i in range(p.crb_roller_count):
            ang = i * 360.0 / p.crb_roller_count
            rad = math.radians(ang)
            cx = 42.5 * math.cos(rad)
            cy = 42.5 * math.sin(rad)
            tilt = 45.0 if i % 2 == 0 else -45.0
            with Locations(Pos(cx, cy, 99.5) * Rot(0, 0, ang) * Rot(tilt, 0, 0)):
                Cylinder(p.crb_roller_d / 2.0, p.crb_roller_len, align=(C, C, C))
    cage.part.label = "Cross_Roller_Cage"
    cage.part.color = "#DCE1E8"

    return Compound(
        label="Cross_Roller_Bearing_Assembly",
        children=[outer.part, inner.part, cage.part],
    )


def build_output_encoder_ring(p: ActuatorParams) -> bd.Part:
    """Ø78/Ø74×4 output magnetic ring, Z106–110."""
    with BuildPart() as ring:
        with Locations((0, 0, 106.0)):
            Cylinder(39.0, 4.0, align=(C, C, MIN))
            Cylinder(37.0, 4.0, align=(C, C, MIN), mode=Mode.SUBTRACT)
    part = ring.part
    part.label = "Output_Encoder_Ring"
    part.color = "#5A5F68"
    return part


def build_output_encoder_pcb(p: ActuatorParams) -> bd.Part:
    """20 tangential × 12 radial × 1.6 board at R40, Z108.7–110.3."""
    with BuildPart() as pcb:
        with Locations((46.0, 0.0, 108.8)):
            Box(12.0, 20.0, 1.6)
    part = pcb.part
    part.label = "Output_Encoder_PCB"
    part.color = "#1F6B3A"
    return part


def build_output_cap(p: ActuatorParams) -> bd.Part:
    """Ø118 output cap/mounting flange, tube OD102/ID86, Z106–120."""
    with BuildPart() as cap:
        # Tube Z106–112 into the body boss
        with Locations((0, 0, 106.0)):
            Cylinder(51.0, 6.0, align=(C, C, MIN))
            Cylinder(43.0, 6.0, align=(C, C, MIN), mode=Mode.SUBTRACT)
        # Flange Z112–120
        with Locations((0, 0, 112.0)):
            Cylinder(59.0, 8.0, align=(C, C, MIN))
            Cylinder(43.0, 8.0, align=(C, C, MIN), mode=Mode.SUBTRACT)
        # 8×M4 customer holes on PCD96, tapped 6 mm deep from Z120
        with Locations((0, 0, 114.0)):
            with PolarLocations(48.0, 8):
                Cylinder(2.0, 6.0, align=(C, C, MIN), mode=Mode.SUBTRACT)
        # 8×M3 cap-to-body holes on PCD110, through the flange
        with Locations((0, 0, 112.0)):
            with PolarLocations(55.0, 8, start_angle=22.5):
                Cylinder(1.7, 8.0, align=(C, C, MIN), mode=Mode.SUBTRACT)
        # Output encoder radial window through the tube wall
        with Locations((45.5, 0.0, 108.0)):
            Box(11.0, 20.0, 3.0, align=(C, C, MIN), mode=Mode.SUBTRACT)
    part = cap.part
    part.label = "Output_Cap_Mount_Flange"
    part.color = "#C4C9D1"
    return part
