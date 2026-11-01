"""Expert-reviewed dimensional baseline for the HA-110 harmonic joint actuator.

All dimensions in millimetres. +Z is the actuator axis; Z=0 is the rear cover
and Z=122 is the customer output face. See
docs/superpowers/specs/2026-11-01-harmonic-actuator-explainer-design.md §4.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class ActuatorParams:
    # ---- envelope ----
    body_od: float = 110.0
    mount_flange_od: float = 118.0
    total_length: float = 122.0
    bore_id: float = 20.0

    # ---- axial stations (Z ranges, mm) ----
    z_rear_cover: tuple[float, float] = (0.0, 3.0)
    z_input_pcb: tuple[float, float] = (3.0, 4.6)
    z_input_ring: tuple[float, float] = (5.8, 7.8)
    z_rear_bearing: tuple[float, float] = (10.0, 17.0)
    z_stator_core: tuple[float, float] = (20.0, 46.0)
    z_windings: tuple[float, float] = (15.0, 51.0)
    z_front_bearing: tuple[float, float] = (51.0, 58.0)
    z_cs: tuple[float, float] = (60.0, 74.0)
    z_fs_rim: tuple[float, float] = (61.0, 73.0)
    z_wg: tuple[float, float] = (61.0, 73.0)
    z_fs_wall: tuple[float, float] = (73.0, 84.0)
    z_fs_diaphragm: tuple[float, float] = (82.0, 87.0)
    z_out_nose: tuple[float, float] = (87.0, 93.0)
    z_crb: tuple[float, float] = (93.0, 106.0)
    z_out_enc_ring: tuple[float, float] = (106.0, 110.0)
    z_out_boss: tuple[float, float] = (106.0, 112.0)
    z_out_enc_pcb: tuple[float, float] = (108.0, 111.0)
    z_out_cap: tuple[float, float] = (106.0, 120.0)
    z_customer_face: float = 122.0

    # ---- motor radial stack ----
    stator_od: float = 92.0
    stator_id: float = 68.0
    stator_core_len: float = 26.0
    stator_slots: int = 24
    air_gap: float = 0.9
    sleeve_od: float = 66.2
    sleeve_id: float = 64.2
    magnet_od: float = 64.2
    magnet_id: float = 58.2
    magnet_poles: int = 20
    rotor_yoke_od: float = 58.2
    rotor_yoke_id: float = 44.0
    rotor_journal_d: float = 30.0
    rotor_bore: float = 20.0
    coil_radial_height: float = 9.5
    coil_tangential_width: float = 5.8
    coil_end_turn: float = 4.5

    # ---- harmonic baseline (50:1) ----
    module: float = 0.5
    zf: int = 100
    zc: int = 102
    fs_pitch_d: float = 50.0
    fs_tip_d: float = 51.0
    fs_root_d: float = 48.75
    fs_inner_d: float = 47.05
    fs_wall: float = 0.85
    fs_tooth_width: float = 12.0
    fs_hub_od: float = 47.0
    fs_hub_id: float = 30.0
    fs_web: float = 1.5
    fs_hub_len: float = 5.0
    cs_od: float = 76.0
    cs_root_d: float = 52.25
    wg_major_d: float = 48.05
    wg_minor_d: float = 46.05
    wg_neutral_major_d: float = 46.65
    wg_neutral_minor_d: float = 44.65
    wg_ball_count: int = 18
    wg_ball_d: float = 2.5
    wg_race_wall: float = 1.0
    fs_hub_bolt_count: int = 8
    fs_hub_bolt_pcd: float = 36.0
    fs_hub_dowel_count: int = 2
    fs_hub_dowel_d: float = 3.0
    fs_hub_spigot_d: float = 44.0

    # ---- bearings ----
    input_bearing: tuple[float, float, float] = (30.0, 42.0, 7.0)  # 6806
    input_bearing_count: int = 2
    crb: tuple[float, float, float] = (70.0, 100.0, 13.0)  # RB7013
    crb_roller_count: int = 36
    crb_roller_d: float = 4.0
    crb_roller_len: float = 4.8
    crb_pitch_d: float = 85.0

    # ---- encoders ----
    in_enc_ring: tuple[float, float, float] = (46.0, 34.0, 2.0)
    in_enc_track_r: float = 20.0
    in_enc_gap: float = 1.2
    in_enc_pcb: tuple[float, float, float] = (18.0, 12.0, 1.6)
    out_enc_ring: tuple[float, float, float] = (78.0, 74.0, 4.0)
    out_enc_track_r: float = 39.0
    out_enc_gap: float = 1.0
    out_enc_pcb: tuple[float, float, float] = (20.0, 12.0, 1.6)

    # ---- output / customer interface ----
    out_flange_od: float = 82.0
    out_flange_bore: float = 20.0
    out_pilot_od: float = 42.0
    out_bolt_pcd: float = 64.0
    out_bolt_count: int = 8
    out_dowel_count: int = 2
    out_dowel_d: float = 4.0
    out_nose_od: float = 48.0
    out_hub_od: float = 70.0
    out_collar_od: float = 74.0

    # ---- mounting / housing ----
    mount_pcd: float = 96.0
    mount_bolt_count: int = 8
    mount_bolt: str = "M4"
    cap_bolt_pcd: float = 110.0
    cap_bolt_count: int = 8
    cap_bolt: str = "M3"
    end_bell_bolt_pcd: float = 100.0
    end_bell_bolt_count: int = 8
    end_bell_bolt: str = "M3"
    rear_cover_od: float = 58.0
    rear_cover_hole_d: float = 24.0
    rear_cover_bolt_pcd: float = 40.0
    rear_cover_bolt_count: int = 4

    # ---- fits (nominal sizes; class in drawing notes) ----
    fit_stator_body: str = "H7/p6"
    fit_cs_body: str = "H7/p6"
    fit_crb_outer_body: str = "H7/m6"
    fit_crb_inner_flange: str = "H7/k6"
    fit_bearing_outer_float: str = "H7/g6"
    fit_bearing_outer_locate: str = "H7/js6"
    fit_bearing_inner_shaft: str = "k6"
    fit_fs_spigot: str = "H7/h6"

    # ---- source-of-truth formulas ----
    @property
    def fs_pitch_r(self) -> float:
        return self.fs_pitch_d / 2.0

    @property
    def fs_tip_r(self) -> float:
        return self.fs_tip_d / 2.0

    @property
    def fs_root_r(self) -> float:
        return self.fs_root_d / 2.0

    @property
    def fs_inner_r(self) -> float:
        return self.fs_inner_d / 2.0

    @property
    def cs_root_r(self) -> float:
        return self.cs_root_d / 2.0

    @property
    def wg_major_r(self) -> float:
        return self.wg_major_d / 2.0

    @property
    def wg_minor_r(self) -> float:
        return self.wg_minor_d / 2.0

    @property
    def wg_neutral_major_r(self) -> float:
        return self.wg_neutral_major_d / 2.0

    @property
    def wg_neutral_minor_r(self) -> float:
        return self.wg_neutral_minor_d / 2.0


DEFAULT = ActuatorParams()
