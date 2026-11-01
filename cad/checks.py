import math

import build123d as bd
from cadgen.geometry import closest_points, overlap_volume

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
    wedge0 = bd.Box(4.0, 0.2, 0.2, align=(bd.Align.CENTER, bd.Align.CENTER, bd.Align.CENTER))
    wedge0 = wedge0.moved(bd.Location((25.5, 0.0, 67.0)))
    wedge90 = bd.Box(4.0, 0.2, 0.2, align=(bd.Align.CENTER, bd.Align.CENTER, bd.Align.CENTER))
    wedge90 = wedge90.moved(bd.Location((0.0, 25.5, 67.0)))
    ov0 = overlap_volume(fs & wedge0, cs & wedge0)
    ov90 = overlap_volume(fs & wedge90, cs & wedge90)
    assert ov0 < 1e-4, ov0
    assert ov90 > 1e-4, ov90
    print("PASS harmonic")


def check_output() -> None:
    p = DEFAULT
    of = build_output_flange(p)
    assert of.label == "Output_Flange"
    assert len(of.solids()) == 1
    obb = of.bounding_box()
    assert abs(obb.size.X - 82.0) < 1e-6 and abs(obb.size.Y - 82.0) < 1e-6
    assert abs(obb.min.Z - 87.0) < 1e-6 and abs(obb.max.Z - 122.0) < 1e-6
    for z, expected in ((90.0, 48.0), (100.0, 70.0), (108.0, 74.0), (115.0, 82.0)):
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
    fs_bolt = bd.Cylinder(1.7, 6.0, align=(bd.Align.CENTER, bd.Align.CENTER, bd.Align.MIN))
    fs_bolt = fs_bolt.moved(bd.Location((18.0, 0.0, 87.0)))
    assert overlap_volume(of, fs_bolt) < 1e-6
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


if __name__ == "__main__":
    check_params()
    check_rear()
    check_motor()
    check_body()
    check_harmonic()
    check_output()
