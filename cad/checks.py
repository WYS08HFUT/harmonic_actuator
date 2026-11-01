from cad.params import DEFAULT


def check_params() -> None:
    p = DEFAULT
    assert p.body_od == 110.0
    assert p.mount_flange_od == 118.0
    assert p.total_length == 122.0
    assert p.z_cs == (60.0, 74.0)
    assert p.wg_major_d - p.wg_minor_d == 2.0
    print("PASS params")


if __name__ == "__main__":
    check_params()
