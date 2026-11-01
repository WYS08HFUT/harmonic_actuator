import build123d as bd
from cadgen.geometry import overlap_volume

from cad.params import DEFAULT
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


if __name__ == "__main__":
    check_params()
    check_rear()
