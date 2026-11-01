import json
import math
import re
import struct
from collections import Counter
from pathlib import Path

import build123d as bd
from cadgen.geometry import closest_points, overlap_volume

from cad.assembly import (
    PART_LABELS,
    ROTATION_GROUPS,
    build_assembly,
    build_cutaway,
)
from cad.params import DEFAULT
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


def check_params() -> None:
    p = DEFAULT
    assert p.body_od == 110.0
    assert p.mount_flange_od == 118.0
    assert p.total_length == 122.0
    assert p.z_cs == (60.0, 74.0)
    assert p.wg_major_d - p.wg_minor_d == 2.0
    print("PASS params")


def check_rear() -> None:
    p = DEFAULT

    cover = build_rear_cover(p)
    assert cover.label == "Rear_Cover"
    size = cover.bounding_box().size
    assert abs(size.X - 58.0) < 1e-6
    assert abs(size.Y - 58.0) < 1e-6
    assert abs(size.Z - 3.0) < 1e-6
    bore = bd.Cylinder(12.0, 3.0, align=(bd.Align.CENTER, bd.Align.CENTER, bd.Align.MIN))
    assert overlap_volume(cover, bore) < 1e-6

    pcb = build_input_encoder_pcb(p)
    assert pcb.label == "Input_Encoder_PCB"
    psize = pcb.bounding_box().size
    assert abs(psize.X - 18.0) < 1e-6
    assert abs(psize.Y - 12.0) < 1e-6
    assert abs(psize.Z - 1.6) < 1e-6
    pc = pcb.bounding_box().center()
    assert abs((pc.X**2 + pc.Y**2) ** 0.5 - 21.0) < 1e-6

    ring = build_input_encoder_ring(p)
    assert ring.label == "Input_Encoder_Ring"
    rsize = ring.bounding_box().size
    assert abs(rsize.X - 46.0) < 1e-6
    assert abs(rsize.Y - 46.0) < 1e-6
    assert abs(rsize.Z - 2.0) < 1e-6
    rbb = ring.bounding_box()
    assert abs(rbb.min.Z - 5.8) < 1e-6
    assert abs(rbb.max.Z - 7.8) < 1e-6

    bell = build_rear_end_bell(p)
    assert bell.label == "Rear_End_Bell"
    assert len(bell.solids()) == 1
    bsize = bell.bounding_box().size
    assert abs(bsize.X - 110.0) < 1e-6
    assert abs(bsize.Y - 110.0) < 1e-6
    assert abs(bsize.Z - 17.0) < 1e-6
    # The bell posts are at PCD50; the cover must use the same circle.
    screw_r = 25.0
    screw = bd.Cylinder(1.25, 6.0, align=(bd.Align.CENTER, bd.Align.CENTER, bd.Align.MIN))
    screw = screw.moved(
        bd.Location((screw_r * math.cos(math.radians(45.0)), screw_r * math.sin(math.radians(45.0)), 0.0))
    )
    assert overlap_volume(cover, screw) < 1e-6, "rear cover screw hole is not at the bell post"
    assert overlap_volume(bell, screw) < 1e-6, "bell post tapped hole is not at the cover screw"

    bearing = build_rear_bearing(p)
    assert bearing.label == "Rear_Bearing_6806"
    assert len(bearing.children) == 3
    labels = {child.label for child in bearing.children}
    assert labels == {"Rear_Bearing_Outer", "Rear_Bearing_Inner", "Rear_Bearing_Balls"}
    outer = next(c for c in bearing.children if c.label == "Rear_Bearing_Outer")
    inner = next(c for c in bearing.children if c.label == "Rear_Bearing_Inner")
    balls = next(c for c in bearing.children if c.label == "Rear_Bearing_Balls")
    osize = outer.bounding_box().size
    isize = inner.bounding_box().size
    assert abs(osize.X - 42.0) < 1e-6 and abs(osize.Y - 42.0) < 1e-6
    assert abs(isize.X - 33.0) < 1e-6 and abs(isize.Y - 33.0) < 1e-6
    assert abs(osize.Z - 7.0) < 1e-6 and abs(isize.Z - 7.0) < 1e-6
    obb = outer.bounding_box()
    assert abs(obb.min.Z - 10.0) < 1e-6 and abs(obb.max.Z - 17.0) < 1e-6
    assert len(balls.solids()) == 10
    assert overlap_volume(outer, inner) < 1e-6
    assert overlap_volume(outer, balls) < 1e-6
    assert overlap_volume(inner, balls) < 1e-6
    print("PASS rear")


def _slice_size(part: bd.Part, z: float) -> tuple[float, float]:
    cutter = bd.Box(200.0, 200.0, 0.2, align=(bd.Align.CENTER, bd.Align.CENTER, bd.Align.MIN))
    cutter = cutter.moved(bd.Location((0.0, 0.0, z - 0.1)))
    sl = part & cutter
    bb = sl.bounding_box()
    return bb.size.X, bb.size.Y


def check_motor() -> None:
    p = DEFAULT

    hub = build_rotor_hub(p)
    assert hub.label == "Rotor_Hub"
    assert len(hub.solids()) == 1
    hsize = hub.bounding_box().size
    assert abs(hsize.X - 58.2) < 1e-6
    assert abs(hsize.Y - 58.2) < 1e-6
    assert abs(hsize.Z - 55.2) < 1e-6
    bore = bd.Cylinder(10.0, 55.2, align=(bd.Align.CENTER, bd.Align.CENTER, bd.Align.MIN))
    bore = bore.moved(bd.Location((0.0, 0.0, 5.8)))
    assert overlap_volume(hub, bore) < 1e-6
    for z, expected in ((13.5, 30.0), (30.0, 58.2), (54.5, 30.0), (59.5, 36.0)):
        sx, sy = _slice_size(hub, z)
        assert abs(sx - expected) < 0.05, (z, sx, expected)
        assert abs(sy - expected) < 0.05, (z, sy, expected)

    core = build_stator_core(p)
    assert core.label == "Frameless_Stator_Core"
    assert len(core.solids()) == 1
    csize = core.bounding_box().size
    assert abs(csize.X - 92.0) < 1e-6
    assert abs(csize.Y - 92.0) < 1e-6
    assert abs(csize.Z - 26.0) < 1e-6
    cbb = core.bounding_box()
    assert abs(cbb.min.Z - 20.0) < 1e-6 and abs(cbb.max.Z - 46.0) < 1e-6
    core_bore = bd.Cylinder(34.0, 26.0, align=(bd.Align.CENTER, bd.Align.CENTER, bd.Align.MIN))
    core_bore = core_bore.moved(bd.Location((0.0, 0.0, 20.0)))
    assert overlap_volume(core, core_bore) < 1e-6

    windings = build_windings(p)
    assert windings.label == "Copper_Stator_Windings"
    assert len(windings.solids()) == 24
    wsize = windings.bounding_box().size
    assert wsize.X <= 92.0 + 1e-6 and wsize.Y <= 92.0 + 1e-6
    wbb = windings.bounding_box()
    assert abs(wbb.min.Z - 15.0) < 1e-6 and abs(wbb.max.Z - 51.0) < 1e-6
    assert overlap_volume(windings, core) < 1e-3, overlap_volume(windings, core)

    magnets = build_rotor_magnets(p)
    assert magnets.label == "NdFeB_Rotor_Magnets"
    assert len(magnets.solids()) == 20
    msize = magnets.bounding_box().size
    assert abs(msize.X - 64.2) < 1e-6 and abs(msize.Y - 64.2) < 1e-6
    mbb = magnets.bounding_box()
    assert abs(mbb.min.Z - 20.0) < 1e-6 and abs(mbb.max.Z - 46.0) < 1e-6

    sleeve = build_carbon_sleeve(p)
    assert sleeve.label == "Carbon_Fiber_Sleeve"
    assert len(sleeve.solids()) == 1
    ssize = sleeve.bounding_box().size
    assert abs(ssize.X - 66.2) < 1e-6 and abs(ssize.Y - 66.2) < 1e-6
    assert abs(ssize.Z - 26.0) < 1e-6

    gap = closest_points(core, sleeve).distance
    assert abs(gap - 0.9) < 0.02, gap

    front = build_front_bearing(p)
    assert front.label == "Front_Bearing_6806"
    assert len(front.children) == 3
    flabels = {child.label for child in front.children}
    assert flabels == {"Front_Bearing_Outer", "Front_Bearing_Inner", "Front_Bearing_Balls"}
    fouter = next(c for c in front.children if c.label == "Front_Bearing_Outer")
    finner = next(c for c in front.children if c.label == "Front_Bearing_Inner")
    fballs = next(c for c in front.children if c.label == "Front_Bearing_Balls")
    fbb = fouter.bounding_box()
    assert abs(fbb.min.Z - 51.0) < 1e-6 and abs(fbb.max.Z - 58.0) < 1e-6
    assert abs(fouter.bounding_box().size.X - 42.0) < 1e-6
    assert abs(finner.bounding_box().size.X - 33.0) < 1e-6
    assert len(fballs.solids()) == 10
    print("PASS motor")


def check_body() -> None:
    p = DEFAULT
    body = build_body_housing(p)
    assert body.label == "Body_Housing"
    assert len(body.solids()) == 1
    bb = body.bounding_box()
    assert abs(bb.min.Z - 10.0) < 1e-6
    assert abs(bb.max.Z - 112.0) < 1e-6
    sx, sy = _slice_size(body, 50.0)
    assert abs(sx - 110.0) < 0.05 and abs(sy - 110.0) < 0.05
    sx, sy = _slice_size(body, 107.0)
    assert abs(sx - 118.0) < 0.05 and abs(sy - 118.0) < 0.05

    axis = bd.Cylinder(10.0, 102.0, align=(bd.Align.CENTER, bd.Align.CENTER, bd.Align.MIN))
    axis = axis.moved(bd.Location((0.0, 0.0, 10.0)))
    assert overlap_volume(body, axis) < 1e-6

    probes = [
        (10.5, 46.0),
        (51.5, 21.0),
        (60.5, 38.0),
        (93.5, 50.0),
        (106.5, 51.0),
    ]
    for z, r in probes:
        probe = bd.Cylinder(r, 0.2, align=(bd.Align.CENTER, bd.Align.CENTER, bd.Align.MIN))
        probe = probe.moved(bd.Location((0.0, 0.0, z - 0.1)))
        assert overlap_volume(body, probe) < 1e-6, (z, r)
    print("PASS body")


def check_harmonic() -> None:
    p = DEFAULT
    cs = build_circular_spline(p)
    assert cs.label == "Circular_Spline_Ring"
    assert len(cs.solids()) == 1
    cbb = cs.bounding_box()
    assert abs(cbb.size.X - 76.0) < 1e-6 and abs(cbb.size.Y - 76.0) < 1e-6
    assert abs(cbb.min.Z - 60.0) < 1e-6 and abs(cbb.max.Z - 74.0) < 1e-6
    cs_bore = bd.Cylinder(25.0, 14.0, align=(bd.Align.CENTER, bd.Align.CENTER, bd.Align.MIN))
    cs_bore = cs_bore.moved(bd.Location((0.0, 0.0, 60.0)))
    assert overlap_volume(cs, cs_bore) < 1e-6

    fs = build_flexspline(p)
    assert fs.label == "Flexspline_Cup"
    assert len(fs.solids()) == 1
    fbb = fs.bounding_box()
    assert abs(fbb.size.X - 51.0) < 1e-6 and abs(fbb.size.Y - 51.0) < 1e-6
    assert abs(fbb.min.Z - 61.0) < 1e-6 and abs(fbb.max.Z - 87.0) < 1e-6
    fs_bore = bd.Cylinder(23.525, 0.2, align=(bd.Align.CENTER, bd.Align.CENTER, bd.Align.MIN))
    fs_bore = fs_bore.moved(bd.Location((0.0, 0.0, 66.9)))
    assert overlap_volume(fs, fs_bore) < 1e-6
    # FS hub side is the clearance side of the 8×M3 joint.
    fs_clear = bd.Cylinder(1.7, 5.0, align=(bd.Align.CENTER, bd.Align.CENTER, bd.Align.MIN))
    fs_clear = fs_clear.moved(bd.Location((18.0, 0.0, 82.0)))
    assert overlap_volume(fs, fs_clear) < 1e-6, "FS hub holes are not M3 clearance"
    # Cam bolts are at PCD28 (r14); the FS hub bore must clear the hex socket.
    cam_tool = bd.Cylinder(1.3, 14.0, align=(bd.Align.CENTER, bd.Align.CENTER, bd.Align.MIN))
    cam_tool = cam_tool.moved(bd.Location((14.0, 0.0, 73.0)))
    assert overlap_volume(fs, cam_tool) < 1e-6, "FS hub bore blocks the cam bolt socket"
    # Ø44 spigot recess on the FS hub (the output flange has the male ring).
    spigot_recess = bd.Cylinder(0.5, 2.0, align=(bd.Align.CENTER, bd.Align.CENTER, bd.Align.MIN))
    spigot_recess = spigot_recess.moved(bd.Location((23.0, 0.0, 85.0)))
    assert overlap_volume(fs, spigot_recess) < 1e-6, "FS hub has no Ø44 spigot recess"

    wg = build_wave_generator(p)
    assert wg.label == "Wave_Generator_Assembly"
    assert len(wg.children) == 3
    wlabels = {child.label for child in wg.children}
    assert wlabels == {
        "Wave_Generator_Cam",
        "Wave_Generator_Balls",
        "Wave_Generator_Flexible_Race",
    }
    race = next(c for c in wg.children if c.label == "Wave_Generator_Flexible_Race")
    cam = next(c for c in wg.children if c.label == "Wave_Generator_Cam")
    balls = next(c for c in wg.children if c.label == "Wave_Generator_Balls")
    rbb = race.bounding_box()
    assert rbb.size.X <= 46.65 + 1e-6, rbb.size.X
    assert rbb.size.X > 46.0 and rbb.size.Y > 44.0
    assert abs(rbb.min.Z - 61.0) < 1e-6 and abs(rbb.max.Z - 73.0) < 1e-6
    assert len(cam.solids()) == 1
    assert len(balls.solids()) == 18
    gap = closest_points(race, fs).distance
    assert gap >= 0.2 - 1e-6, gap

    # Tooth phase: at 0° an FS tooth sits in a CS space (no overlap);
    # at 90° an FS tooth lines up with a CS tooth (overlap).
    # The 90° wedge must be tangential, not a radially-long box.
    wedge0 = bd.Box(4.0, 0.2, 0.2, align=(bd.Align.CENTER, bd.Align.CENTER, bd.Align.CENTER))
    wedge0 = wedge0.moved(bd.Location((25.5, 0.0, 67.0)))
    wedge90 = bd.Box(0.2, 4.0, 0.2, align=(bd.Align.CENTER, bd.Align.CENTER, bd.Align.CENTER))
    wedge90 = wedge90.moved(bd.Location((0.0, 25.5, 67.0)))
    ov0 = overlap_volume(fs & wedge0, cs & wedge0)
    ov90 = overlap_volume(fs & wedge90, cs & wedge90)
    assert ov0 < 1e-4, ov0
    assert ov90 > 1e-4, ov90

    def phase_ok(fs_space_start: float, cs_space_start: float = 0.0) -> bool:
        fs_pitch = 360.0 / p.zf
        cs_pitch = 360.0 / p.zc
        fs_tooth0 = (fs_space_start - fs_pitch / 2.0) % 360.0
        cs_space0 = cs_space_start % 360.0
        if abs(fs_tooth0 - cs_space0) > 1e-9:
            return False
        fs_angle = 90.0
        k = (fs_angle - fs_tooth0) / fs_pitch
        if abs(k - round(k)) > 1e-9:
            return False
        cs_tooth0 = cs_space_start + cs_pitch / 2.0
        j = (fs_angle - cs_tooth0) / cs_pitch
        return abs(j - round(j)) < 1e-9

    assert phase_ok(1.8), "FS/CS phase does not align tooth 0 with space 0"
    assert phase_ok(1.8, 0.0)
    assert not phase_ok(1.8 + 360.0 / p.zf), "phase check fails to reject a one-tooth shift"
    print("PASS harmonic")


def check_output() -> None:
    p = DEFAULT
    of = build_output_flange(p)
    assert of.label == "Output_Flange"
    assert len(of.solids()) == 1
    obb = of.bounding_box()
    assert abs(obb.size.X - 82.0) < 1e-6 and abs(obb.size.Y - 82.0) < 1e-6
    assert abs(obb.min.Z - 85.0) < 1e-6 and abs(obb.max.Z - 122.0) < 1e-6
    for z, expected in (
        (86.0, 47.0),
        (90.0, 48.0),
        (92.5, 82.0),
        (93.5, 70.0),
        (100.0, 70.0),
        (108.0, 74.0),
        (115.0, 82.0),
    ):
        sx, sy = _slice_size(of, z)
        assert abs(sx - expected) < 0.05, (z, sx, expected)
        assert abs(sy - expected) < 0.05, (z, sy, expected)
    bore = bd.Cylinder(10.0, 35.0, align=(bd.Align.CENTER, bd.Align.CENTER, bd.Align.MIN))
    bore = bore.moved(bd.Location((0.0, 0.0, 87.0)))
    assert overlap_volume(of, bore) < 1e-6
    pilot = bd.Cylinder(21.0, 4.0, align=(bd.Align.CENTER, bd.Align.CENTER, bd.Align.MIN))
    pilot = pilot.moved(bd.Location((0.0, 0.0, 118.0)))
    assert overlap_volume(of, pilot) < 1e-6
    m5_cb = bd.Cylinder(4.8, 4.5, align=(bd.Align.CENTER, bd.Align.CENTER, bd.Align.MIN))
    m5_cb = m5_cb.moved(bd.Location((32.0, 0.0, 117.5)))
    assert overlap_volume(of, m5_cb) < 1e-6
    m5_thru = bd.Cylinder(2.6, 12.0, align=(bd.Align.CENTER, bd.Align.CENTER, bd.Align.MIN))
    m5_thru = m5_thru.moved(bd.Location((32.0, 0.0, 110.0)))
    assert overlap_volume(of, m5_thru) < 1e-6
    # FS joint: the output-flange nose must be tapped (M3 core Ø2.5) because
    # the FS hub side is the clearance side.
    fs_tap = bd.Cylinder(1.5, 6.0, align=(bd.Align.CENTER, bd.Align.CENTER, bd.Align.MIN))
    fs_tap = fs_tap.moved(bd.Location((18.0, 0.0, 87.0)))
    assert overlap_volume(of, fs_tap) > 1e-3, "output flange nose is not tapped for the FS joint"
    cs = build_circular_spline(p)
    assert overlap_volume(of, cs) < 1e-6

    crb = build_cross_roller_bearing(p)
    assert crb.label == "Cross_Roller_Bearing_Assembly"
    assert len(crb.children) == 3
    clabels = {child.label for child in crb.children}
    assert clabels == {
        "Cross_Roller_Outer_Race",
        "Cross_Roller_Inner_Race",
        "Cross_Roller_Cage",
    }
    outer = next(c for c in crb.children if c.label == "Cross_Roller_Outer_Race")
    inner = next(c for c in crb.children if c.label == "Cross_Roller_Inner_Race")
    cage = next(c for c in crb.children if c.label == "Cross_Roller_Cage")
    assert len(outer.solids()) == 1 and len(inner.solids()) == 1
    obb = outer.bounding_box()
    assert abs(obb.size.X - 100.0) < 1e-6 and abs(obb.size.Y - 100.0) < 1e-6
    assert abs(obb.min.Z - 93.0) < 1e-6 and abs(obb.max.Z - 106.0) < 1e-6
    ibb = inner.bounding_box()
    assert abs(ibb.size.X - 82.0) < 1e-6 and abs(ibb.size.Y - 82.0) < 1e-6
    assert len(cage.solids()) == 36
    assert overlap_volume(outer, inner) < 1e-6
    assert closest_points(cage, inner).distance < 0.01
    assert closest_points(cage, outer).distance < 0.01

    enc_ring = build_output_encoder_ring(p)
    assert enc_ring.label == "Output_Encoder_Ring"
    erbb = enc_ring.bounding_box()
    assert abs(erbb.size.X - 78.0) < 1e-6 and abs(erbb.size.Y - 78.0) < 1e-6
    assert abs(erbb.min.Z - 106.0) < 1e-6 and abs(erbb.max.Z - 110.0) < 1e-6

    pcb = build_output_encoder_pcb(p)
    assert pcb.label == "Output_Encoder_PCB"
    pbb = pcb.bounding_box()
    dims = sorted([round(pbb.size.X, 6), round(pbb.size.Y, 6), round(pbb.size.Z, 6)])
    assert dims == [1.6, 12.0, 20.0], dims
    assert abs(pbb.min.X - 40.0) < 1e-6
    assert pbb.min.Z >= 108.0 - 1e-6 and pbb.max.Z <= 111.0 + 1e-6

    cap = build_output_cap(p)
    assert cap.label == "Output_Cap_Mount_Flange"
    assert len(cap.solids()) == 1
    cbb = cap.bounding_box()
    assert abs(cbb.size.X - 118.0) < 1e-6 and abs(cbb.size.Y - 118.0) < 1e-6
    assert abs(cbb.min.Z - 106.0) < 1e-6 and abs(cbb.max.Z - 120.0) < 1e-6
    cap_id = bd.Cylinder(43.0, 14.0, align=(bd.Align.CENTER, bd.Align.CENTER, bd.Align.MIN))
    cap_id = cap_id.moved(bd.Location((0.0, 0.0, 106.0)))
    assert overlap_volume(cap, cap_id) < 1e-6
    m4 = bd.Cylinder(2.0, 6.0, align=(bd.Align.CENTER, bd.Align.CENTER, bd.Align.MIN))
    m4 = m4.moved(bd.Location((48.0, 0.0, 114.0)))
    assert overlap_volume(cap, m4) < 1e-6
    m3 = bd.Cylinder(1.7, 8.0, align=(bd.Align.CENTER, bd.Align.CENTER, bd.Align.MIN))
    m3 = m3.moved(bd.Location((55.0 * math.cos(math.radians(22.5)), 55.0 * math.sin(math.radians(22.5)), 112.0)))
    assert overlap_volume(cap, m3) < 1e-6
    assert (86.0 - 82.0) / 2.0 >= 2.0 - 1e-6
    print("PASS output")


def _bbox_touch(a: bd.Shape, b: bd.Shape, tol: float = 0.5) -> bool:
    ba = a.bounding_box()
    bb = b.bounding_box()
    return not (
        ba.max.X < bb.min.X - tol
        or ba.min.X > bb.max.X + tol
        or ba.max.Y < bb.min.Y - tol
        or ba.min.Y > bb.max.Y + tol
        or ba.max.Z < bb.min.Z - tol
        or ba.min.Z > bb.max.Z + tol
    )


def _labels(obj: bd.Shape) -> list[str]:
    out = [obj.label]
    for child in getattr(obj, "children", []):
        out.extend(_labels(child))
    return out


def check_assembly() -> None:
    p = DEFAULT
    assy = build_assembly(p)
    assert assy.label == "HA_110_Actuator"
    abb = assy.bounding_box()
    assert abb.size.X <= 118.01, abb.size.X
    assert abb.size.Y <= 118.01, abb.size.Y
    assert abb.size.Z <= 122.01, abb.size.Z

    bore = bd.Cylinder(10.0, 124.0, align=(bd.Align.CENTER, bd.Align.CENTER, bd.Align.MIN))
    bore = bore.moved(bd.Location((0.0, 0.0, -1.0)))
    assert overlap_volume(assy, bore) < 1.0

    counts = Counter(_labels(assy))
    for label in PART_LABELS:
        assert counts[label] == 1, (label, counts[label])
    assert set(ROTATION_GROUPS) == set(PART_LABELS)
    assert set(ROTATION_GROUPS.values()) <= {"static", "input", "output", "half_speed"}

    top = {child.label: child for child in assy.children}
    excluded = {
        frozenset(("Circular_Spline_Ring", "Flexspline_Cup")),
        frozenset(("Wave_Generator_Assembly", "Flexspline_Cup")),
    }
    labels = sorted(top)
    for i, a in enumerate(labels):
        for b in labels[i + 1 :]:
            if frozenset((a, b)) in excluded:
                continue
            if not _bbox_touch(top[a], top[b]):
                continue
            ov = overlap_volume(top[a], top[b])
            assert ov < 1e-3, (a, b, ov)

    cs = top["Circular_Spline_Ring"]
    fs = top["Flexspline_Cup"]
    wg = top["Wave_Generator_Assembly"]
    crb = top["Cross_Roller_Bearing_Assembly"]
    body = top["Body_Housing"]
    of = top["Output_Flange"]
    assert closest_points(cs, fs).distance < 1e-3
    fs_cs_overlap = overlap_volume(cs, fs)
    assert 0.0 <= fs_cs_overlap < 250.0, fs_cs_overlap
    wg_cam = next(c for c in wg.children if c.label == "Wave_Generator_Cam")
    wg_balls = next(c for c in wg.children if c.label == "Wave_Generator_Balls")
    wg_race = next(c for c in wg.children if c.label == "Wave_Generator_Flexible_Race")
    assert overlap_volume(wg_cam, fs) < 1e-3, "WG cam collides with FS"
    assert overlap_volume(wg_balls, fs) < 1e-3, "WG balls collide with FS"
    assert overlap_volume(wg_race, fs) < 5.0, "WG race–FS preload exceeds 5 mm³"
    c_outer = next(c for c in crb.children if c.label == "Cross_Roller_Outer_Race")
    c_inner = next(c for c in crb.children if c.label == "Cross_Roller_Inner_Race")
    c_cage = next(c for c in crb.children if c.label == "Cross_Roller_Cage")
    assert closest_points(of, c_inner).distance < 1e-3, "CRB inner ring lacks a rotating shoulder"
    assert closest_points(body, c_inner).distance >= 0.9, "CRB inner ring rubs the static body"
    assert closest_points(c_cage, c_outer).distance < 0.01
    assert closest_points(c_cage, c_inner).distance < 0.01
    assert overlap_volume(c_cage, c_outer) < 1.0
    assert overlap_volume(c_cage, c_inner) < 1.0

    # Fastener alignment/access for the remaining joints.
    bell = top["Rear_End_Bell"]
    rotor = top["Rotor_Hub"]
    cap = top["Output_Cap_Mount_Flange"]
    bell_screw = bd.Cylinder(1.25, 16.0, align=(bd.Align.CENTER, bd.Align.CENTER, bd.Align.MIN))
    bell_screw = bell_screw.moved(bd.Location((50.0, 0.0, 0.0)))
    assert overlap_volume(bell, bell_screw) < 1e-6, "bell/body screw path blocked"
    assert overlap_volume(body, bell_screw) < 1e-6
    cap_x = 55.0 * math.cos(math.radians(22.5))
    cap_y = 55.0 * math.sin(math.radians(22.5))
    cap_screw = bd.Cylinder(1.25, 14.0, align=(bd.Align.CENTER, bd.Align.CENTER, bd.Align.MIN))
    cap_screw = cap_screw.moved(bd.Location((cap_x, cap_y, 106.0)))
    assert overlap_volume(cap, cap_screw) < 1e-6, "cap/body screw path blocked"
    assert overlap_volume(body, cap_screw) < 1e-6
    cam_screw = bd.Cylinder(1.25, 15.0, align=(bd.Align.CENTER, bd.Align.CENTER, bd.Align.MIN))
    cam_screw = cam_screw.moved(bd.Location((14.0, 0.0, 58.0)))
    assert overlap_volume(wg_cam, cam_screw) < 1e-6, "cam/rotor screw path blocked"
    assert overlap_volume(rotor, cam_screw) < 1e-6

    crb_path = bd.Cylinder(50.0, 19.0, align=(bd.Align.CENTER, bd.Align.CENTER, bd.Align.MIN))
    crb_path = crb_path.moved(bd.Location((0.0, 0.0, 93.0)))
    assert overlap_volume(body, crb_path) < 1e-6
    stator_path = bd.Cylinder(46.0, 41.0, align=(bd.Align.CENTER, bd.Align.CENTER, bd.Align.MIN))
    stator_path = stator_path.moved(bd.Location((0.0, 0.0, 10.0)))
    assert overlap_volume(body, stator_path) < 1e-6

    assert closest_points(of, cs).distance >= 2.0
    assert closest_points(fs, of).distance < 1e-3
    fs_hub = fs & bd.Box(80.0, 80.0, 5.0, align=(bd.Align.CENTER, bd.Align.CENTER, bd.Align.MIN)).moved(
        bd.Location((0.0, 0.0, 82.0))
    )
    assert closest_points(fs_hub, cs).distance >= 2.0

    for label in (
        "Body_Housing",
        "Output_Flange",
        "Rear_End_Bell",
        "Output_Cap_Mount_Flange",
        "Flexspline_Cup",
        "Circular_Spline_Ring",
        "Rotor_Hub",
        "Frameless_Stator_Core",
    ):
        assert len(top[label].solids()) == 1, label

    cut = build_cutaway(p)
    assert cut.label == "HA_110_Actuator_Cutaway"
    cut_labels = set(_labels(cut))
    assert {"Flexspline_Cup", "Wave_Generator_Assembly", "Output_Flange", "Body_Housing"} <= cut_labels
    cut_body = next(c for c in cut.children if c.label == "Body_Housing")
    assert cut_body.volume < body.volume
    assert len(cut_body.solids()) == 1
    cut_fs = next(c for c in cut.children if c.label == "Flexspline_Cup")
    cut_wg = next(c for c in cut.children if c.label == "Wave_Generator_Assembly")
    cut_of = next(c for c in cut.children if c.label == "Output_Flange")
    assert abs(cut_fs.volume - fs.volume) < 1e-6, "cutaway should not touch the FS"
    assert abs(cut_wg.volume - wg.volume) < 1e-6, "cutaway should not touch the WG"
    assert abs(cut_of.volume - of.volume) < 1e-6, "cutaway should not touch the output flange"
    print("PASS assembly")


ROOT = Path(__file__).resolve().parents[1]
ASSEMBLY_STEP = ROOT / "models" / "harmonic_actuator_v2_assembly.step"
CUTAWAY_STEP = ROOT / "models" / "harmonic_actuator_v2_cutaway.step"
CUTAWAY_STL = ROOT / "models" / "harmonic_actuator_v2_cutaway.stl"
GLB = ROOT / "models" / "harmonic_actuator_v2.glb"
WEB_GLB = ROOT / "web" / "public" / "assets" / "harmonic_actuator_v2.glb"
MANIFEST = ROOT / "web" / "public" / "assets" / "harmonic_actuator.json"
TEACHING_SVG = ROOT / "drawings" / "harmonic_actuator_section_teaching.svg"
NEUTRAL_SVG = ROOT / "drawings" / "harmonic_actuator_section_neutral.svg"
WEB_TEACHING_SVG = ROOT / "web" / "public" / "assets" / "harmonic_actuator_section_teaching.svg"


def _glb_json(path: Path) -> dict:
    with path.open("rb") as f:
        magic, version, total = struct.unpack("<4sII", f.read(12))
        assert magic == b"glTF" and version == 2
        chunk_len, chunk_type = struct.unpack("<II", f.read(8))
        assert chunk_type == 0x4E4F534A
        return json.loads(f.read(chunk_len))


def check_assets() -> None:
    for path in (ASSEMBLY_STEP, CUTAWAY_STEP, CUTAWAY_STL, GLB, WEB_GLB, MANIFEST):
        assert path.exists(), path
        assert path.stat().st_size > 0, path

    glb = _glb_json(GLB)
    web_glb = _glb_json(WEB_GLB)
    assert WEB_GLB.read_bytes() == GLB.read_bytes(), "web GLB is stale"
    nodes = glb.get("nodes", [])
    names = {node.get("name") for node in nodes}
    for label in PART_LABELS:
        assert label in names, label
    assert len(names) == len(nodes), "duplicate GLB node names"
    assert len(glb.get("materials", [])) >= 10
    meshes = glb.get("meshes", [])
    assert meshes and all(len(mesh.get("primitives", [])) > 0 for mesh in meshes)
    positions = [
        a for a in glb.get("accessors", []) if a.get("type") == "VEC3" and "min" in a and "max" in a
    ]
    assert positions, "no VEC3 accessor bounds"
    max_coord = max(max(a["max"][i] for a in positions) for i in range(3))
    assert max_coord > 60.0, f"GLB is not numeric mm: max coordinate {max_coord}"
    scene_nodes = glb.get("scenes", [{}])[0].get("nodes", [])
    root = nodes[scene_nodes[0]] if scene_nodes else nodes[0]
    rot = root.get("rotation")
    assert rot is not None and abs(rot[0]) > 0.6, f"expected Y-up root rotation, got {rot}"
    assert len(web_glb.get("nodes", [])) == len(nodes)

    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    assert manifest["id"] == "ha-110"
    assert manifest["units"] == "mm"
    assert manifest["axis"] == "Z"
    assert manifest["gltf_up"] == "Y"
    assert manifest["gltf_units"] == "mm"
    parts = manifest["parts"]
    assert len(parts) == 24, len(parts)
    assert {part["node"] for part in parts} == set(PART_LABELS)
    for part in parts:
        assert part["node"] in names
        assert part["group"] in {"static", "input", "output", "half_speed"}
        assert len(part["explode_offset"]) == 3
        assert part["explode_order"] >= 0
    procedural = {part["node"] for part in parts if part["procedural"]}
    assert procedural == {
        "Flexspline_Cup",
        "Circular_Spline_Ring",
        "Wave_Generator_Cam",
        "Wave_Generator_Balls",
        "Wave_Generator_Flexible_Race",
    }
    cut_set = {part["node"] for part in parts if part["cut"]}
    assert cut_set == {
        "Body_Housing",
        "Frameless_Stator_Core",
        "Copper_Stator_Windings",
        "Circular_Spline_Ring",
        "Rear_End_Bell",
        "Rear_Cover",
        "Output_Cap_Mount_Flange",
    }, cut_set
    ghost_set = {part["node"] for part in parts if part["ghost_in_transmission"]}
    assert ghost_set == {
        "Body_Housing",
        "Frameless_Stator_Core",
        "Copper_Stator_Windings",
        "Circular_Spline_Ring",
        "Output_Cap_Mount_Flange",
    }, ghost_set
    child_groups = {part["node"]: part["child_groups"] for part in parts if "child_groups" in part}
    assert child_groups == {
        "Rear_Bearing_6806": {"Rear_Bearing_Inner": "input", "Rear_Bearing_Balls": "half_speed"},
        "Front_Bearing_6806": {"Front_Bearing_Inner": "input", "Front_Bearing_Balls": "half_speed"},
    }, child_groups
    for groups in child_groups.values():
        for child_node, group in groups.items():
            assert child_node in names, child_node
            assert group in {"input", "half_speed"}, group
    assert manifest["ratio"] == {"min": 20, "max": 100, "step": 0.5, "default": 50}
    assert manifest["input_speed"] == {
        "min": 0,
        "max": 3000,
        "default": 1000,
        "visual_scale": 0.05,
    }
    print("PASS assets")


def check_drawings() -> None:
    for path in (TEACHING_SVG, NEUTRAL_SVG, WEB_TEACHING_SVG):
        assert path.exists(), path
        assert path.stat().st_size > 0, path
    required = ("HA-110", "Ø110", "Ø118", "Ø20", "50:1", "Zf=100", "Zc=102")
    teaching = TEACHING_SVG.read_text(encoding="utf-8")
    neutral = NEUTRAL_SVG.read_text(encoding="utf-8")
    for text in (teaching, neutral):
        for token in required:
            assert token in text, token
    for token in ("长轴啮合", "短轴脱开", "扭矩路径", "反力路径", "齿部按安装变形状态示意"):
        assert token in teaching, token
    assert "齿部按安装变形状态示意" not in neutral
    assert "中性状态" in neutral
    assert "圆柔轮" in neutral
    assert WEB_TEACHING_SVG.read_text(encoding="utf-8") == teaching

    # The two bottom dimension captions must not share a baseline, and the
    # overall-length chain must be present.
    caption_ys = []
    for caption in ("Ø110 机身 / Ø118 安装法兰", "Ø20 通孔 · Ø82 输出法兰 · PCD Ø64"):
        match = re.search(
            r'<text x="[^"]+" y="([\d.]+)"[^>]*>' + re.escape(caption) + r"</text>",
            teaching,
        )
        assert match, caption
        caption_ys.append(float(match.group(1)))
    assert caption_ys[1] - caption_ys[0] >= 5.0, caption_ys
    assert '<line x1="20.00" y1="43.00" x2="20.00" y2="165.00"' in teaching
    assert "总长 122" in teaching
    print("PASS drawings")


if __name__ == "__main__":
    check_params()
    check_rear()
    check_motor()
    check_body()
    check_harmonic()
    check_output()
    check_assembly()
    check_assets()
    check_drawings()
