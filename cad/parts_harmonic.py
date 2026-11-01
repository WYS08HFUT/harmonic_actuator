"""Harmonic set: circular spline, flexspline cup, neutral wave generator."""

import math

import build123d as bd
from build123d import (
    Align,
    Box,
    BuildPart,
    BuildSketch,
    Circle,
    Compound,
    Cylinder,
    Ellipse,
    Locations,
    Mode,
    Plane,
    PolarLocations,
    Sphere,
    extrude,
)

from cad.params import ActuatorParams

C = Align.CENTER
MIN = Align.MIN


def build_circular_spline(p: ActuatorParams) -> bd.Part:
    """Ø76 rigid internal gear, 102 teeth, root bore Ø52.25, Z60–74."""
    with BuildPart() as cs:
        with Locations((0, 0, p.z_cs[0])):
            Cylinder(p.cs_od / 2.0, 14.0, align=(C, C, MIN))
            Cylinder(25.0, 14.0, align=(C, C, MIN), mode=Mode.SUBTRACT)
        # 102 tooth spaces; tooth 0 is at half-pitch, so a space is at 0°.
        with Locations((0, 0, p.z_cs[0])):
            with PolarLocations(25.525, p.zc, start_angle=0.0):
                Box(1.25, 0.82, 14.0, align=(C, C, MIN), mode=Mode.SUBTRACT)
    part = cs.part
    part.label = "Circular_Spline_Ring"
    part.color = "#6E7681"
    return part


def build_flexspline(p: ActuatorParams) -> bd.Part:
    """Thin cup with 100 external teeth; diaphragm and hub on the output side."""
    with BuildPart() as fs:
        # Toothed rim Z61–73
        with Locations((0, 0, p.z_fs_rim[0])):
            Cylinder(25.5, 12.0, align=(C, C, MIN))
            Cylinder(23.525, 12.0, align=(C, C, MIN), mode=Mode.SUBTRACT)
        # 100 tooth spaces; tooth 0 at 0°, space at half-pitch.
        with Locations((0, 0, p.z_fs_rim[0])):
            with PolarLocations(24.975, p.zf, start_angle=1.8):
                Box(1.2, 0.82, 12.0, align=(C, C, MIN), mode=Mode.SUBTRACT)
        # Cup wall Z72.5–84 (overlaps the rim for a single solid)
        with Locations((0, 0, 72.5)):
            Cylinder(24.375, 11.5, align=(C, C, MIN))
            Cylinder(23.525, 11.5, align=(C, C, MIN), mode=Mode.SUBTRACT)
        # Diaphragm web Z82–83.5
        with Locations((0, 0, 82.0)):
            Cylinder(24.375, 1.5, align=(C, C, MIN))
            Cylinder(p.fs_hub_id / 2.0, 1.5, align=(C, C, MIN), mode=Mode.SUBTRACT)
        # Output hub Z82–87, Ø47/Ø32 (Ø32 clears the cam bolt socket)
        with Locations((0, 0, 82.0)):
            Cylinder(23.5, 5.0, align=(C, C, MIN))
            Cylinder(p.fs_hub_id / 2.0, 5.0, align=(C, C, MIN), mode=Mode.SUBTRACT)
        # 8×M3 output-flange bolts on PCD36; FS side is the clearance side
        with Locations((0, 0, 82.0)):
            with PolarLocations(18.0, 8):
                Cylinder(1.7, 5.0, align=(C, C, MIN), mode=Mode.SUBTRACT)
        # 2×Ø3 dowels, clocked between the bolts
        with Locations((0, 0, 82.0)):
            with PolarLocations(18.0, 2, start_angle=22.5):
                Cylinder(1.5, 5.0, align=(C, C, MIN), mode=Mode.SUBTRACT)
    # Ø44 × 2 spigot recess on the FS hub (output flange has the male ring).
    with BuildPart() as recess_ring:
        with Locations((0, 0, 85.0)):
            Cylinder(23.5, 2.0, align=(C, C, MIN))
            Cylinder(22.0, 2.0, align=(C, C, MIN), mode=Mode.SUBTRACT)
    part = fs.part - recess_ring.part
    part.label = "Flexspline_Cup"
    part.color = "#AEB9C8"
    return part


def build_wave_generator(p: ActuatorParams) -> Compound:
    """Neutral elliptical WG: race, 18 balls, cam; sized to clear the round FS."""
    # Neutral ellipse (CAD state); the viewer uses the working ellipse.
    race_major = p.wg_neutral_major_r
    race_minor = p.wg_neutral_minor_r
    race_inner_major = race_major - p.wg_race_wall
    race_inner_minor = race_minor - p.wg_race_wall
    ball_major = race_inner_major - p.wg_ball_d / 2.0
    ball_minor = race_inner_minor - p.wg_ball_d / 2.0
    cam_major = ball_major - p.wg_ball_d / 2.0
    cam_minor = ball_minor - p.wg_ball_d / 2.0
    z0, z1 = p.z_wg
    width = z1 - z0

    with BuildPart() as race:
        with BuildSketch(Plane.XY.offset(z0)):
            Ellipse(race_major, race_minor)
            Ellipse(race_inner_major, race_inner_minor, mode=Mode.SUBTRACT)
        extrude(amount=width)
    race.part.label = "Wave_Generator_Flexible_Race"
    race.part.color = "#DCE1E8"

    with BuildPart() as cam:
        with BuildSketch(Plane.XY.offset(z0)):
            Ellipse(cam_major, cam_minor)
            Circle(p.bore_id / 2.0, mode=Mode.SUBTRACT)
        extrude(amount=width)
        with Locations((0, 0, z0)):
            with PolarLocations(14.0, 6):
                Cylinder(1.7, width, align=(C, C, MIN), mode=Mode.SUBTRACT)
    cam.part.label = "Wave_Generator_Cam"
    cam.part.color = "#C08A3E"

    with BuildPart() as balls:
        for i in range(p.wg_ball_count):
            t = 2.0 * math.pi * i / p.wg_ball_count
            with Locations((ball_major * math.cos(t), ball_minor * math.sin(t), (z0 + z1) / 2.0)):
                Sphere(p.wg_ball_d / 2.0)
    balls.part.label = "Wave_Generator_Balls"
    balls.part.color = "#DCE1E8"

    return Compound(
        label="Wave_Generator_Assembly",
        children=[race.part, cam.part, balls.part],
    )
