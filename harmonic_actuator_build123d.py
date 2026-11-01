#!/usr/bin/env python3
"""
Frameless BLDC Motor Integrated with Harmonic Drive Gear Reducer
Compact High-Torque Rotary Actuator for Humanoid Robot Joints

Parametric CAD Model implemented with `build123d` (Builder & Algebra Modes).
Reference Architecture:
  - Harmonic Drive CSD-20-80 / CSD-20-100 Component Set (Ø76 mm CS OD, Ø51 mm pitch)
  - RB7013 / RU-Series Cross Roller Bearing (Ø70 mm ID × Ø100 mm OD × 13 mm width)
  - TQ-RoboDrive ILM85-Class Slotless/Segmented Frameless BLDC Stator & Carbon-Sleeved NdFeB Rotor
  - RLS AksIM-2 Off-Axis Multi-Turn Absolute Magnetic Encoder & Side-Mounted Readhead PCB
  - Integrated Finned Aluminum Thermal Management Jacket & Stepped Link Output Flange

Usage (requires Python 3.10+ with `pip install build123d`):
  python3 harmonic_actuator_build123d.py
Outputs:
  - harmonic_actuator_assembly.step (Full multi-body STEP assembly)
  - harmonic_actuator_cutaway.step  (270-degree exhibition cutaway STEP assembly)
  - harmonic_actuator_cutaway.stl   (Triangulated mesh export)
"""

from dataclasses import dataclass
import math
from build123d import (
    Align,
    Axis,
    Box,
    BuildLine,
    BuildPart,
    BuildSketch,
    Circle,
    Color,
    Compound,
    CounterBoreHole,
    Cylinder,
    Ellipse,
    GridLocations,
    Hole,
    Line,
    Locations,
    Mode,
    Part,
    Plane,
    PolarLocations,
    Polygon,
    Pos,
    Rectangle,
    RegularPolygon,
    Rot,
    SlotOverall,
    Sphere,
    Torus,
    chamfer,
    export_gltf,
    export_step,
    export_stl,
    extrude,
    fillet,
    make_face,
    revolve,
)


# ==============================================================================
# 1. PARAMETRIC ENGINEERING SPECIFICATION (Units: millimeters)
# ==============================================================================
@dataclass(frozen=True)
class ActuatorParams:
    # Global Envelope & Hollow Bore
    housing_od: float = 110.0          # Outer diameter of thermal cooling jacket
    hollow_bore_id: float = 20.0       # Central through-bore for cable routing
    total_length: float = 122.0        # Total axial length (Z = 0 to 122 mm)

    # 1. Thermal Management Housing (Z = 0 to 82 mm)
    rear_cap_thickness: float = 7.0
    motor_section_length: float = 52.0
    bearing_housing_od: float = 108.0
    cooling_groove_depth: float = 2.5
    cooling_groove_width: float = 3.0
    cooling_groove_count: int = 4
    housing_flange_od: float = 118.0
    housing_flange_z: float = 48.0
    housing_flange_thick: float = 8.0
    housing_bolt_pcd: float = 110.0
    housing_bolt_count: int = 12
    housing_bolt_dia: float = 4.5      # M4 clearance holes

    # 2. Frameless BLDC Motor Stator (Z = 10 to 42 mm)
    stator_od: float = 92.0
    stator_id: float = 68.0
    stator_core_length: float = 26.0
    stator_z_start: float = 12.0
    stator_slot_count: int = 24        # 24 concentrated copper coils
    coil_radial_height: float = 9.5
    coil_tangential_width: float = 5.8
    coil_end_turn_ext: float = 4.5     # Axial overhang of copper windings

    # 3. Frameless BLDC Motor Rotor & Carbon Fiber Sleeve (Z = 8 to 58 mm)
    rotor_sleeve_od: float = 66.4      # 0.8 mm radial airgap to stator
    rotor_sleeve_thick: float = 1.0    # High-strength CFRP retention sleeve
    rotor_magnet_od: float = 64.4
    rotor_magnet_id: float = 56.0
    rotor_pole_count: int = 20         # 20-pole surface NdFeB magnet array
    rotor_yoke_id: float = 36.0
    rotor_hub_id: float = 26.0

    # 4. Multi-Turn Absolute Encoder Assembly (Mounted on Rear/Side Boss, Z = 8 to 38 mm)
    encoder_pcb_length: float = 36.0
    encoder_pcb_width: float = 22.0
    encoder_pcb_thick: float = 2.2
    encoder_mount_x: float = -56.5     # Mounted on flat machined boss on left side
    encoder_mount_z: float = 24.0
    encoder_ring_od: float = 46.0
    encoder_ring_id: float = 36.0

    # 5. Cross Roller Bearing (RB7013 Class, Z = 56 to 72 mm)
    crb_z_center: float = 64.0
    crb_id: float = 70.0
    crb_od: float = 100.0
    crb_width: float = 14.0
    crb_pitch_dia: float = 85.0
    crb_roller_dia: float = 5.0
    crb_roller_length: float = 4.8
    crb_roller_count: int = 36         # Alternating +45° / -45° crossed rollers

    # 6. Harmonic Drive Wave Generator (CSD-20 Series, Z = 72 to 94 mm)
    wg_z_center: float = 88.0
    wg_major_dia: float = 51.4         # Elliptical major axis 2a
    wg_minor_dia: float = 48.6         # Elliptical minor axis 2b
    wg_width: float = 13.0
    wg_ball_count: int = 18
    wg_ball_dia: float = 3.8

    # 7. Harmonic Drive Flexspline (Thin Cup with Relief Windows, Z = 54 to 98 mm)
    fs_z_diaphragm: float = 55.0
    fs_cup_length: float = 42.0
    fs_pitch_dia: float = 50.0         # Z_f = 100 teeth, module m = 0.5 mm
    fs_wall_thick: float = 0.85
    fs_tooth_Band_width: float = 12.0
    fs_teeth_count: int = 100
    fs_window_count: int = 16          # Weight/stiffness tuning rectangular windows

    # 8. Harmonic Drive Circular Spline (Rigid Internal Gear, Z = 82 to 100 mm)
    cs_z_start: float = 82.0
    cs_width: float = 16.0
    cs_od: float = 76.0                # Matches CSD-20-100-2A-GR catalog OD (76 mm)
    cs_id: float = 51.0                # Z_c = 102 teeth (2 teeth more than Flexspline)
    cs_teeth_count: int = 102
    cs_bolt_pcd: float = 66.0
    cs_bolt_count: int = 12

    # 9. Output Flange Interface (Z = 96 to 122 mm)
    out_flange_z_start: float = 96.0
    out_flange_od: float = 82.0
    out_flange_length: float = 24.0
    out_pilot_od: float = 42.0
    out_bolt_pcd: float = 64.0
    out_bolt_count: int = 8            # 8× M5 counterbored mounting interface
    out_pin_count: int = 4             # 4× H7 precision dowel pin holes
    out_ext_gear_teeth: int = 72       # Precision machined secondary timing/sensor spline


# ==============================================================================
# 2. COMPONENT BUILDER FUNCTIONS (build123d Builder Mode)
# ==============================================================================

def build_thermal_housing(p: ActuatorParams) -> Part:
    """
    Builds the outer aluminum housing with integrated cooling jacket grooves,
    rear bearing bore, middle mounting flange, cross-roller seat, and encoder boss.
    """
    with BuildPart() as housing:
        # Main stepped outer cylinder shell (Z = 0 to 96 mm)
        Cylinder(
            radius=p.housing_od / 2,
            height=p.motor_section_length,
            align=(Align.CENTER, Align.CENTER, Align.MIN),
        )
        # Central mounting flange ring
        with Locations((0, 0, p.housing_flange_z)):
            Cylinder(
                radius=p.housing_flange_od / 2,
                height=p.housing_flange_thick,
                align=(Align.CENTER, Align.CENTER, Align.MIN),
            )
        # Forward bearing & harmonic drive housing barrel (Z = 52 to 98 mm)
        with Locations((0, 0, p.motor_section_length)):
            Cylinder(
                radius=p.bearing_housing_od / 2,
                height=26.0,
                align=(Align.CENTER, Align.CENTER, Align.MIN),
            )
        with Locations((0, 0, 78.0)):
            Cylinder(
                radius=88.0 / 2,
                height=20.0,
                align=(Align.CENTER, Align.CENTER, Align.MIN),
            )

        # Circumferential cooling jacket grooves/slots on motor housing OD
        for idx in range(p.cooling_groove_count):
            z_pos = 10.0 + idx * 8.5
            with Locations((0, 0, z_pos)):
                Cylinder(
                    radius=p.housing_od / 2 + 0.5,
                    height=p.cooling_groove_width,
                    align=(Align.CENTER, Align.CENTER, Align.CENTER),
                    mode=Mode.SUBTRACT,
                )
                Cylinder(
                    radius=p.housing_od / 2 - p.cooling_groove_depth,
                    height=p.cooling_groove_width,
                    align=(Align.CENTER, Align.CENTER, Align.CENTER),
                    mode=Mode.ADD,
                )

        # Subtract internal stepped bores for stator, bearings, and harmonic reducer
        # 1. Rear encoder & bearing access bore
        Cylinder(
            radius=48.0 / 2,
            height=p.rear_cap_thickness + 1.0,
            align=(Align.CENTER, Align.CENTER, Align.MIN),
            mode=Mode.SUBTRACT,
        )
        # 2. Stator press-fit bore (Z = 7 to 56 mm)
        with Locations((0, 0, p.rear_cap_thickness)):
            Cylinder(
                radius=p.stator_od / 2,
                height=49.0,
                align=(Align.CENTER, Align.CENTER, Align.MIN),
                mode=Mode.SUBTRACT,
            )
        # 3. Cross-roller bearing outer seat (Z = 56 to 78 mm)
        with Locations((0, 0, 56.0)):
            Cylinder(
                radius=p.crb_od / 2,
                height=22.0,
                align=(Align.CENTER, Align.CENTER, Align.MIN),
                mode=Mode.SUBTRACT,
            )
        # 4. Circular spline seat (Z = 78 to 98 mm)
        with Locations((0, 0, 78.0)):
            Cylinder(
                radius=p.cs_od / 2,
                height=21.0,
                align=(Align.CENTER, Align.CENTER, Align.MIN),
                mode=Mode.SUBTRACT,
            )

        # Mounting bolt pattern on central housing flange
        with Locations((0, 0, p.housing_flange_z + p.housing_flange_thick)):
            with PolarLocations(
                radius=p.housing_bolt_pcd / 2, count=p.housing_bolt_count
            ):
                Hole(radius=p.housing_bolt_dia / 2, depth=p.housing_flange_thick + 2.0)

        # Side flat boss & window for Multi-Turn Absolute Encoder PCB mounting
        with Locations((p.encoder_mount_x + 3.5, 0, p.encoder_mount_z)):
            Box(
                8.0,
                p.encoder_pcb_width + 6.0,
                p.encoder_pcb_length + 6.0,
                align=(Align.CENTER, Align.CENTER, Align.CENTER),
            )
            # Sensor readhead optical/magnetic window slot into encoder ring cavity
            Box(
                16.0,
                10.0,
                14.0,
                align=(Align.CENTER, Align.CENTER, Align.CENTER),
                mode=Mode.SUBTRACT,
            )

    housing.part.label = "Thermal_Cooling_Housing"
    housing.part.color = Color(0.76, 0.78, 0.81, 1.0)
    return housing.part


def build_motor_stator_and_windings(p: ActuatorParams) -> Compound:
    """
    Builds the frameless BLDC stator lamination core and 24 high-density copper coils.
    """
    # 1. Silicon Steel Stator Core (Back-iron + 24 Stator Teeth)
    with BuildPart() as stator_core:
        with Locations((0, 0, p.stator_z_start)):
            # Outer back-iron yoke ring
            Cylinder(
                radius=p.stator_od / 2,
                height=p.stator_core_length,
                align=(Align.CENTER, Align.CENTER, Align.MIN),
            )
            Cylinder(
                radius=(p.stator_od - 7.0) / 2,
                height=p.stator_core_length,
                align=(Align.CENTER, Align.CENTER, Align.MIN),
                mode=Mode.SUBTRACT,
            )
            # 24 Stator teeth extending radially inward to stator_id
            r_mid = (p.stator_id + p.stator_od - 7.0) / 4.0
            tooth_len = (p.stator_od - 7.0 - p.stator_id) / 2.0
            with PolarLocations(radius=r_mid, count=p.stator_slot_count):
                Box(
                    tooth_len,
                    3.2,
                    p.stator_core_length,
                    align=(Align.CENTER, Align.CENTER, Align.MIN),
                )

    stator_core.part.label = "Frameless_Stator_Core"
    stator_core.part.color = Color(0.28, 0.30, 0.34, 1.0)

    # 2. Copper Windings (24 Concentrated Coils with rounded end-turns)
    with BuildPart() as copper_windings:
        r_coil = (p.stator_id + p.stator_od - 6.0) / 4.0
        coil_z = p.stator_z_start - p.coil_end_turn_ext
        coil_h = p.stator_core_length + 2.0 * p.coil_end_turn_ext
        with Locations((0, 0, coil_z)):
            with PolarLocations(radius=r_coil, count=p.stator_slot_count):
                Box(
                    p.coil_radial_height,
                    p.coil_tangential_width,
                    coil_h,
                    align=(Align.CENTER, Align.CENTER, Align.MIN),
                )
                # Hollow out core center of each bobbin coil
                Box(
                    p.coil_radial_height - 2.4,
                    3.3,
                    p.stator_core_length,
                    align=(Align.CENTER, Align.CENTER, Align.MIN),
                    mode=Mode.SUBTRACT,
                )

    copper_windings.part.label = "Copper_Stator_Windings"
    copper_windings.part.color = Color(0.82, 0.49, 0.22, 1.0)

    return Compound(
        label="Frameless_BLDC_Stator_Assembly",
        children=[stator_core.part, copper_windings.part],
    )


def build_motor_rotor_assembly(p: ActuatorParams) -> Compound:
    """
    Builds the hollow-shaft motor rotor hub, 20-pole segmented NdFeB magnets,
    and outer carbon-fiber retention sleeve.
    """
    # 1. Hollow Rotor Titanium/Steel Hub & Shaft (couples to Wave Generator)
    with BuildPart() as rotor_hub:
        # Central hollow shaft running from Z = 6 to Z = 95 mm
        with Locations((0, 0, 6.0)):
            Cylinder(
                radius=p.rotor_hub_id / 2 + 3.0,
                height=88.0,
                align=(Align.CENTER, Align.CENTER, Align.MIN),
            )
        # Rotor yoke drum carrying magnets (Z = 12 to 38 mm)
        with Locations((0, 0, p.stator_z_start)):
            Cylinder(
                radius=p.rotor_magnet_id / 2,
                height=p.stator_core_length,
                align=(Align.CENTER, Align.CENTER, Align.MIN),
            )
            # Lightening recess inside rotor drum
            Cylinder(
                radius=(p.rotor_magnet_id - 6.0) / 2,
                height=p.stator_core_length - 5.0,
                align=(Align.CENTER, Align.CENTER, Align.MIN),
                mode=Mode.SUBTRACT,
            )
        # Through-bore for internal robot joint cabling
        Cylinder(
            radius=p.hollow_bore_id / 2,
            height=p.total_length + 10.0,
            align=(Align.CENTER, Align.CENTER, Align.MIN),
            mode=Mode.SUBTRACT,
        )

    rotor_hub.part.label = "Hollow_Rotor_Shaft_Hub"
    rotor_hub.part.color = Color(0.68, 0.70, 0.73, 1.0)

    # 2. Segmented NdFeB Permanent Magnets (20 poles)
    with BuildPart() as magnets:
        r_mag = (p.rotor_magnet_id + p.rotor_magnet_od) / 4.0
        mag_thick = (p.rotor_magnet_od - p.rotor_magnet_id) / 2.0
        mag_width = (math.pi * p.rotor_magnet_id / p.rotor_pole_count) * 0.86
        with Locations((0, 0, p.stator_z_start)):
            with PolarLocations(radius=r_mag, count=p.rotor_pole_count):
                Box(
                    mag_thick,
                    mag_width,
                    p.stator_core_length,
                    align=(Align.CENTER, Align.CENTER, Align.MIN),
                )

    magnets.part.label = "NdFeB_Rotor_Magnets"
    magnets.part.color = Color(0.35, 0.37, 0.40, 1.0)

    # 3. Carbon Fiber Retention Sleeve (Over-wrapped on rotor OD)
    with BuildPart() as carbon_sleeve:
        with Locations((0, 0, p.stator_z_start)):
            Cylinder(
                radius=p.rotor_sleeve_od / 2,
                height=p.stator_core_length,
                align=(Align.CENTER, Align.CENTER, Align.MIN),
            )
            Cylinder(
                radius=p.rotor_magnet_od / 2,
                height=p.stator_core_length,
                align=(Align.CENTER, Align.CENTER, Align.MIN),
                mode=Mode.SUBTRACT,
            )

    carbon_sleeve.part.label = "Carbon_Fiber_Sleeve"
    carbon_sleeve.part.color = Color(0.16, 0.17, 0.19, 1.0)

    return Compound(
        label="Motor_Rotor_Assembly",
        children=[rotor_hub.part, magnets.part, carbon_sleeve.part],
    )


def build_encoder_assembly(p: ActuatorParams) -> Compound:
    """
    Builds the off-axis magnetic encoder code wheel and the side-mounted
    high-resolution multi-turn absolute encoder PCB with IC package and connectors.
    """
    # 1. Magnetic Encoder Code Ring on Rotor
    with BuildPart() as code_ring:
        with Locations((0, 0, 8.0)):
            Cylinder(
                radius=p.encoder_ring_od / 2,
                height=4.0,
                align=(Align.CENTER, Align.CENTER, Align.MIN),
            )
            Cylinder(
                radius=p.encoder_ring_id / 2,
                height=4.0,
                align=(Align.CENTER, Align.CENTER, Align.MIN),
                mode=Mode.SUBTRACT,
            )
    code_ring.part.label = "Encoder_Magnetic_Ring"
    code_ring.part.color = Color(0.25, 0.27, 0.30, 1.0)

    # 2. Green FR4 Readhead PCB mounted on left side boss (as shown in reference image)
    with BuildPart() as pcb:
        with Locations((p.encoder_mount_x, 0, p.encoder_mount_z)):
            Box(
                p.encoder_pcb_thick,
                p.encoder_pcb_width,
                p.encoder_pcb_length,
                align=(Align.CENTER, Align.CENTER, Align.CENTER),
            )
            # 4× M2.5 corner mounting holes
            with Locations((0, -8.5, -14.5), (0, 8.5, -14.5), (0, -8.5, 14.5), (0, 8.5, 14.5)):
                Cylinder(
                    radius=1.3,
                    height=p.encoder_pcb_thick + 2.0,
                    rotation=(0, 90, 0),
                    mode=Mode.SUBTRACT,
                )
    pcb.part.label = "Encoder_Readhead_PCB"
    pcb.part.color = Color(0.12, 0.42, 0.22, 1.0)

    # 3. Main QFP Encoder ASIC & Top/Bottom Micro Connectors
    with BuildPart() as ic_and_connectors:
        # Central QFP ASIC chip
        with Locations((p.encoder_mount_x - 1.8, 0, p.encoder_mount_z)):
            Box(1.6, 9.0, 9.0, align=(Align.CENTER, Align.CENTER, Align.CENTER))
        # Top & Bottom JST/Picoblade headers
        with Locations(
            (p.encoder_mount_x - 2.2, 0, p.encoder_mount_z + 13.5),
            (p.encoder_mount_x - 2.2, 0, p.encoder_mount_z - 13.5),
        ):
            Box(3.0, 10.0, 4.2, align=(Align.CENTER, Align.CENTER, Align.CENTER))

    ic_and_connectors.part.label = "Encoder_ASIC_And_Headers"
    ic_and_connectors.part.color = Color(0.15, 0.15, 0.17, 1.0)

    return Compound(
        label="MultiTurn_Encoder_Assembly",
        children=[code_ring.part, pcb.part, ic_and_connectors.part],
    )


def build_cross_roller_bearing(p: ActuatorParams) -> Compound:
    """
    Builds the high-rigidity Cross Roller Bearing (RB7013 / RU-class) with V-grooved
    inner/outer races and alternating ±45° orthogonal cylindrical rollers.
    """
    z0 = p.crb_z_center - p.crb_width / 2

    # 1. Outer Ring
    with BuildPart() as outer_ring:
        with Locations((0, 0, z0)):
            Cylinder(
                radius=p.crb_od / 2,
                height=p.crb_width,
                align=(Align.CENTER, Align.CENTER, Align.MIN),
            )
            Cylinder(
                radius=(p.crb_pitch_dia + 2.2) / 2,
                height=p.crb_width,
                align=(Align.CENTER, Align.CENTER, Align.MIN),
                mode=Mode.SUBTRACT,
            )
    outer_ring.part.label = "Cross_Roller_Outer_Race"
    outer_ring.part.color = Color(0.72, 0.74, 0.78, 1.0)

    # 2. Inner Ring
    with BuildPart() as inner_ring:
        with Locations((0, 0, z0)):
            Cylinder(
                radius=(p.crb_pitch_dia - 2.2) / 2,
                height=p.crb_width,
                align=(Align.CENTER, Align.CENTER, Align.MIN),
            )
            Cylinder(
                radius=p.crb_id / 2,
                height=p.crb_width,
                align=(Align.CENTER, Align.CENTER, Align.MIN),
                mode=Mode.SUBTRACT,
            )
    inner_ring.part.label = "Cross_Roller_Inner_Race"
    inner_ring.part.color = Color(0.75, 0.77, 0.80, 1.0)

    # 3. Alternating 90-degree Crossed Cylindrical Rollers
    with BuildPart() as rollers:
        r_pitch = p.crb_pitch_dia / 2
        for i in range(p.crb_roller_count):
            angle_deg = i * (360.0 / p.crb_roller_count)
            angle_rad = math.radians(angle_deg)
            tilt = 45.0 if (i % 2 == 0) else -45.0
            cx = r_pitch * math.cos(angle_rad)
            cy = r_pitch * math.sin(angle_rad)
            with Locations(Pos(cx, cy, p.crb_z_center) * Rot(0, 0, angle_deg) * Rot(tilt, 0, 0)):
                Cylinder(
                    radius=p.crb_roller_dia / 2,
                    height=p.crb_roller_length,
                    align=(Align.CENTER, Align.CENTER, Align.CENTER),
                )
    rollers.part.label = "Crossed_Cylindrical_Rollers"
    rollers.part.color = Color(0.88, 0.90, 0.93, 1.0)

    return Compound(
        label="Cross_Roller_Bearing_Assembly",
        children=[outer_ring.part, inner_ring.part, rollers.part],
    )


def build_wave_generator(p: ActuatorParams) -> Compound:
    """
    Builds the elliptical Wave Generator plug, brass ball cage, and elliptical
    thin-section ball bearing that deforms the Flexspline.
    """
    a_plug = p.wg_major_dia / 2 - 4.2
    b_plug = p.wg_minor_dia / 2 - 4.2
    a_pitch = p.wg_major_dia / 2 - 2.1
    b_pitch = p.wg_minor_dia / 2 - 2.1

    # 1. Elliptical Cam Plug + Brass Retainer Collar
    with BuildPart() as wg_cam:
        with BuildSketch(Plane.XY.offset(p.wg_z_center - p.wg_width / 2)):
            Ellipse(x_radius=a_plug, y_radius=b_plug)
            Circle(radius=p.rotor_hub_id / 2 + 3.0, mode=Mode.SUBTRACT)
        extrude(amount=p.wg_width)
    wg_cam.part.label = "Wave_Generator_Elliptical_Cam"
    wg_cam.part.color = Color(0.75, 0.62, 0.32, 1.0)  # Bronze/brass hub tone

    # 2. Elliptical Bearing Balls
    with BuildPart() as wg_balls:
        for i in range(p.wg_ball_count):
            theta = 2.0 * math.pi * i / p.wg_ball_count
            bx = a_pitch * math.cos(theta)
            by = b_pitch * math.sin(theta)
            with Locations((bx, by, p.wg_z_center)):
                Sphere(radius=p.wg_ball_dia / 2)
    wg_balls.part.label = "Wave_Generator_Bearing_Balls"
    wg_balls.part.color = Color(0.90, 0.92, 0.95, 1.0)

    # 3. Thin Flexible Outer Bearing Race
    with BuildPart() as wg_outer_race:
        with BuildSketch(Plane.XY.offset(p.wg_z_center - p.wg_width / 2)):
            Ellipse(x_radius=p.wg_major_dia / 2, y_radius=p.wg_minor_dia / 2)
            Ellipse(
                x_radius=p.wg_major_dia / 2 - 1.1,
                y_radius=p.wg_minor_dia / 2 - 1.1,
                mode=Mode.SUBTRACT,
            )
        extrude(amount=p.wg_width)
    wg_outer_race.part.label = "Wave_Generator_Flexible_Race"
    wg_outer_race.part.color = Color(0.80, 0.82, 0.85, 1.0)

    return Compound(
        label="Wave_Generator_Assembly",
        children=[wg_cam.part, wg_balls.part, wg_outer_race.part],
    )


def build_flexspline(p: ActuatorParams) -> Part:
    """
    Builds the thin cup-shaped Flexspline with rear mounting diaphragm,
    rectangular axial relief windows (visible in the cutaway image), and
    external spline teeth at the open rim.
    """
    r_outer = p.fs_pitch_dia / 2
    r_inner = r_outer - p.fs_wall_thick

    with BuildPart() as flexspline:
        # Cup cylindrical wall (Z = 55 to 97 mm)
        with Locations((0, 0, p.fs_z_diaphragm)):
            Cylinder(
                radius=r_outer,
                height=p.fs_cup_length,
                align=(Align.CENTER, Align.CENTER, Align.MIN),
            )
            Cylinder(
                radius=r_inner,
                height=p.fs_cup_length + 1.0,
                align=(Align.CENTER, Align.CENTER, Align.MIN),
                mode=Mode.SUBTRACT,
            )
        # Rear diaphragm flange connecting cup to output drive shaft
        with Locations((0, 0, p.fs_z_diaphragm)):
            Cylinder(
                radius=r_outer,
                height=2.2,
                align=(Align.CENTER, Align.CENTER, Align.MIN),
            )
            Cylinder(
                radius=17.0,
                height=2.5,
                align=(Align.CENTER, Align.CENTER, Align.MIN),
                mode=Mode.SUBTRACT,
            )

        # Rectangular flex-relief windows around mid-cup circumference (as in reference photo)
        with Locations((0, 0, p.fs_z_diaphragm + 16.0)):
            with PolarLocations(radius=r_outer, count=p.fs_window_count):
                Box(
                    4.0,
                    3.6,
                    9.0,
                    align=(Align.CENTER, Align.CENTER, Align.CENTER),
                    mode=Mode.SUBTRACT,
                )

        # External gear teeth band near open cup rim (Z = 83 to 96 mm)
        z_tooth_start = p.fs_z_diaphragm + p.fs_cup_length - p.fs_tooth_Band_width - 1.5
        with Locations((0, 0, z_tooth_start)):
            Cylinder(
                radius=r_outer + 0.65,
                height=p.fs_tooth_Band_width,
                align=(Align.CENTER, Align.CENTER, Align.MIN),
            )
            Cylinder(
                radius=r_inner,
                height=p.fs_tooth_Band_width,
                align=(Align.CENTER, Align.CENTER, Align.MIN),
                mode=Mode.SUBTRACT,
            )
            with PolarLocations(radius=r_outer + 0.75, count=p.fs_teeth_count):
                Box(
                    1.1,
                    0.75,
                    p.fs_tooth_Band_width,
                    align=(Align.CENTER, Align.CENTER, Align.MIN),
                    mode=Mode.SUBTRACT,
                )

    flexspline.part.label = "Flexspline_Cup"
    flexspline.part.color = Color(0.82, 0.84, 0.87, 1.0)
    return flexspline.part


def build_circular_spline(p: ActuatorParams) -> Part:
    """
    Builds the rigid Circular Spline with internal gear teeth (Z_c = Z_f + 2 = 102)
    and axial mounting bolt holes.
    """
    with BuildPart() as circular_spline:
        with Locations((0, 0, p.cs_z_start)):
            Cylinder(
                radius=p.cs_od / 2,
                height=p.cs_width,
                align=(Align.CENTER, Align.CENTER, Align.MIN),
            )
            Cylinder(
                radius=p.cs_id / 2,
                height=p.cs_width,
                align=(Align.CENTER, Align.CENTER, Align.MIN),
                mode=Mode.SUBTRACT,
            )
            # Internal gear tooth slots (102 teeth)
            with PolarLocations(radius=p.cs_id / 2, count=p.cs_teeth_count):
                Box(
                    1.1,
                    0.75,
                    p.cs_width,
                    align=(Align.CENTER, Align.CENTER, Align.MIN),
                    mode=Mode.SUBTRACT,
                )
            # 12× M3 mounting holes on PCD 66 mm
            with PolarLocations(radius=p.cs_bolt_pcd / 2, count=p.cs_bolt_count):
                Cylinder(
                    radius=1.7,
                    height=p.cs_width,
                    align=(Align.CENTER, Align.CENTER, Align.MIN),
                    mode=Mode.SUBTRACT,
                )

    circular_spline.part.label = "Circular_Spline_Ring"
    circular_spline.part.color = Color(0.64, 0.67, 0.71, 1.0)
    return circular_spline.part


def build_output_flange(p: ActuatorParams) -> Part:
    """
    Builds the high-precision Output Flange Interface with stepped pilot boss,
    external precision spline ring, central hollow shaft bore, and 8× M5
    counterbored link mounting holes.
    """
    with BuildPart() as output_flange:
        # Rear flange collar coupled to Cross Roller Bearing inner ring & Flexspline
        with Locations((0, 0, p.out_flange_z_start)):
            Cylinder(
                radius=p.out_flange_od / 2 - 4.0,
                height=8.0,
                align=(Align.CENTER, Align.CENTER, Align.MIN),
            )
        # Precision machined external gear/spline ring (shown behind front flange in image)
        with Locations((0, 0, p.out_flange_z_start + 2.0)):
            Cylinder(
                radius=p.out_flange_od / 2 - 1.5,
                height=7.0,
                align=(Align.CENTER, Align.CENTER, Align.MIN),
            )
            with PolarLocations(
                radius=p.out_flange_od / 2 - 1.2, count=p.out_ext_gear_teeth
            ):
                Box(
                    1.6,
                    1.2,
                    7.0,
                    align=(Align.CENTER, Align.CENTER, Align.MIN),
                    mode=Mode.SUBTRACT,
                )

        # Main front link mounting flange (Z = 104 to 118 mm)
        with Locations((0, 0, p.out_flange_z_start + 8.0)):
            Cylinder(
                radius=p.out_flange_od / 2,
                height=14.0,
                align=(Align.CENTER, Align.CENTER, Align.MIN),
            )
        # Raised precision pilot boss (Z = 118 to 122 mm)
        with Locations((0, 0, p.out_flange_z_start + 22.0)):
            Cylinder(
                radius=p.out_pilot_od / 2,
                height=4.0,
                align=(Align.CENTER, Align.CENTER, Align.MIN),
            )

        # Central hollow bore & inner locking collar recess
        Cylinder(
            radius=p.hollow_bore_id / 2,
            height=p.total_length + 10.0,
            align=(Align.CENTER, Align.CENTER, Align.MIN),
            mode=Mode.SUBTRACT,
        )
        with Locations((0, 0, p.out_flange_z_start + 18.0)):
            Cylinder(
                radius=15.0,
                height=9.0,
                align=(Align.CENTER, Align.CENTER, Align.MIN),
                mode=Mode.SUBTRACT,
            )

        # 8× M5 Counterbored mounting holes on PCD Ø64 mm
        with Locations((0, 0, p.out_flange_z_start + 22.0)):
            with PolarLocations(radius=p.out_bolt_pcd / 2, count=p.out_bolt_count):
                CounterBoreHole(
                    radius=2.6,
                    counter_bore_radius=4.8,
                    counter_bore_depth=4.5,
                    depth=14.0,
                )
        # 4× Ø4 H7 Dowel pin holes on PCD Ø64 mm (offset by 22.5°)
        with Locations((0, 0, p.out_flange_z_start + 22.0)):
            with PolarLocations(
                radius=p.out_bolt_pcd / 2,
                count=p.out_pin_count,
                start_angle=22.5,
            ):
                Hole(radius=2.0, depth=10.0)

    output_flange.part.label = "Output_Flange_Interface"
    output_flange.part.color = Color(0.84, 0.86, 0.89, 1.0)
    return output_flange.part


def apply_exhibition_cutaway(part: Part, z_max: float = 104.0) -> Part:
    """
    Applies a 90-degree front-upper quadrant cutaway (X > 0, Y < 0, Z < z_max)
    to reveal the internal stator windings, rotor magnets, cross-roller bearing,
    wave generator, flexspline, and circular spline—matching the reference cutaway diagram.
    """
    with BuildPart() as cut_box:
        with Locations((0, 0, 2.0)):
            Box(
                80.0,
                80.0,
                z_max,
                align=(Align.MIN, Align.MAX, Align.MIN),
            )
    return part - cut_box.part


# ==============================================================================
# 3. FULL ASSEMBLY & EXPORT ENTRYPOINT
# ==============================================================================

def build_complete_actuator(
    params: ActuatorParams = ActuatorParams(), cutaway: bool = True
) -> Compound:
    """
    Constructs the complete Frameless BLDC + Harmonic Drive Actuator assembly.
    """
    housing = build_thermal_housing(params)
    stator_assy = build_motor_stator_and_windings(params)
    rotor_assy = build_motor_rotor_assembly(params)
    encoder_assy = build_encoder_assembly(params)
    crb_assy = build_cross_roller_bearing(params)
    wg_assy = build_wave_generator(params)
    flexspline = build_flexspline(params)
    circular_spline = build_circular_spline(params)
    output_flange = build_output_flange(params)

    if cutaway:
        housing = apply_exhibition_cutaway(housing, z_max=104.0)
        stator_children = [
            apply_exhibition_cutaway(ch, z_max=104.0) for ch in stator_assy.children
        ]
        stator_assy = Compound(
            label="Frameless_BLDC_Stator_Assembly", children=stator_children
        )
        flexspline = apply_exhibition_cutaway(flexspline, z_max=98.0)
        circular_spline = apply_exhibition_cutaway(circular_spline, z_max=100.0)

    assembly = Compound(
        label="Humanoid_Harmonic_BLDC_Actuator",
        children=[
            housing,
            stator_assy,
            rotor_assy,
            encoder_assy,
            crb_assy,
            wg_assy,
            flexspline,
            circular_spline,
            output_flange,
        ],
    )
    return assembly


if __name__ == "__main__":
    spec = ActuatorParams()
    print("Building Full Actuator Assembly...")
    full_assy = build_complete_actuator(spec, cutaway=False)
    export_step(full_assy, "harmonic_actuator_assembly.step")

    print("Building 270-Degree Cutaway Exhibition Assembly...")
    cut_assy = build_complete_actuator(spec, cutaway=True)
    export_step(cut_assy, "harmonic_actuator_cutaway.step")
    export_stl(cut_assy, "harmonic_actuator_cutaway.stl")
    print("Export complete.")