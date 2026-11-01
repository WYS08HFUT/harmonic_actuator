"""Generate the teaching and neutral axial-section SVGs for the HA-110."""

from pathlib import Path

from cad.params import DEFAULT, ActuatorParams

ROOT = Path(__file__).resolve().parents[1]
DRAWINGS = ROOT / "drawings"
WEB_ASSETS = ROOT / "web" / "public" / "assets"

S = 1.0


def _x(r: float) -> float:
    return 30.0 + S * r


def _y(z: float) -> float:
    return 165.0 - S * z


def _rect(r0, r1, z0, z1, fill, opacity=1.0, stroke="#1F2328", sw=0.45):
    return (
        f'<rect x="{_x(r0):.2f}" y="{_y(z1):.2f}" width="{(r1-r0)*S:.2f}" '
        f'height="{(z1-z0)*S:.2f}" fill="{fill}" fill-opacity="{opacity}" '
        f'stroke="{stroke}" stroke-width="{sw}"/>'
    )


def _circle(r, z, rad, fill, stroke="#1F2328", sw=0.4):
    return (
        f'<circle cx="{_x(r):.2f}" cy="{_y(z):.2f}" r="{rad*S:.2f}" '
        f'fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>'
    )


def _text(x, y, s, size=4.4, fill="#1F2328", weight="400", anchor="start"):
    return (
        f'<text x="{x:.2f}" y="{y:.2f}" font-size="{size}" fill="{fill}" '
        f'font-weight="{weight}" text-anchor="{anchor}">{s}</text>'
    )


def _label(r, z, tx, ty, s, color="#1F2328", lane=None):
    """Leader label; with a lane it routes orthogonally instead of cutting across."""
    x0, y0 = _x(r), _y(z)
    if lane is None:
        points = f"{x0:.2f},{y0:.2f} {tx-2:.2f},{ty-1.2:.2f}"
    else:
        points = (
            f"{x0:.2f},{y0:.2f} {lane:.2f},{y0:.2f} "
            f"{lane:.2f},{ty:.2f} {tx-2:.2f},{ty:.2f}"
        )
    return (
        f'<polyline points="{points}" fill="none" stroke="#8A857C" '
        f'stroke-width="0.3" stroke-dasharray="1 1" stroke-linejoin="round"/>'
        f'<circle cx="{x0:.2f}" cy="{y0:.2f}" r="0.7" fill="{color}"/>'
        + _text(tx, ty, s, 4.2, color)
    )


def _svg(teaching: bool) -> str:
    fs_inner = 24.025 if teaching else 23.525
    fs_tip = 26.0 if teaching else 25.5
    fs_root = 24.875 if teaching else 24.375
    wg_race_in = 23.025 if teaching else 22.325
    wg_race_out = 24.025 if teaching else 23.325
    wg_ball = 21.775 if teaching else 21.075
    wg_cam = 20.525 if teaching else 19.825

    p = []
    p.append(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 182" '
        'width="960" height="728" font-family="Inter, Noto Sans SC, Arial, sans-serif">'
    )
    p.append('<rect width="240" height="180" fill="#FBFAF7"/>')
    p.append(_text(30, 14, "HA-110 谐波关节模组", 10.5, "#1F2328", "700"))
    p.append(_text(30, 20, "轴向剖面 · 50:1 基准 · Ø110 机身 / Ø118 安装法兰", 4.8, "#5B6B7A"))
    p.append(_text(30, 25.5, "单位 mm · Zf=100 · Zc=102 · 总长 122", 4.2, "#5B6B7A"))

    # centerline
    p.append(
        f'<line x1="{_x(0):.2f}" y1="{_y(122):.2f}" x2="{_x(0):.2f}" y2="{_y(0):.2f}" '
        'stroke="#B8B2A8" stroke-width="0.4" stroke-dasharray="2 1.2 0.5 1.2"/>'
    )

    # rear end
    p.append(_rect(29, 55, 0, 3, "#E8E6E0"))          # end-bell rear flange
    p.append(_rect(40, 55, 0, 10, "#E8E6E0"))         # outer shell
    p.append(_rect(32, 55, 9, 10, "#E8E6E0"))         # web
    p.append(_rect(21, 33, 9.5, 17, "#E8E6E0"))       # bearing boss
    p.append(_rect(12, 29, 0, 3, "#C4C9D1"))          # rear cover
    p.append(_rect(12, 30, 3, 4.6, "#1F6B3A", 0.9))   # input PCB
    p.append(_rect(17, 23, 5.8, 7.8, "#5A5F68"))      # input ring
    p.append(_rect(10, 23, 7.8, 9.5, "#8A9099"))      # rotor rear flange
    p.append(_circle(18, 13.5, 1.5, "#DCE1E8"))       # rear bearing ball
    p.append(_rect(19.5, 21, 10, 17, "#DCE1E8"))      # rear bearing outer
    p.append(_rect(15, 16.5, 10, 17, "#DCE1E8"))      # rear bearing inner

    # rotor / motor
    p.append(_rect(10, 15, 9.5, 20, "#8A9099"))
    p.append(_rect(10, 29.1, 20, 46, "#8A9099"))
    p.append(_rect(29.1, 32.1, 20, 46, "#3A3F47"))
    p.append(_rect(32.1, 33.1, 20, 46, "#2A2D33"))
    p.append(_rect(34, 46, 20, 46, "#5B616B"))
    p.append(_rect(34, 43.5, 15, 51, "#DB802E", 0.85))
    p.append(_rect(10, 15, 46, 58, "#8A9099"))
    p.append(_rect(10, 18, 58, 61, "#8A9099"))
    p.append(_circle(18, 54.5, 1.5, "#DCE1E8"))
    p.append(_rect(19.5, 21, 51, 58, "#DCE1E8"))
    p.append(_rect(15, 16.5, 51, 58, "#DCE1E8"))

    # body / housing
    p.append(_rect(46, 55, 10, 51, "#E8E6E0"))
    p.append(_rect(21, 55, 51, 58, "#E8E6E0"))
    p.append(_rect(26, 55, 58, 60, "#E8E6E0"))
    p.append(_rect(38, 55, 60, 74, "#E8E6E0"))
    p.append(_rect(38, 55, 74, 93, "#E8E6E0"))
    p.append(_rect(38, 42, 92, 93, "#FBFAF7", 1.0, "none", 0))  # CRB inner-ring relief
    p.append(_rect(50, 55, 93, 106, "#E8E6E0"))
    p.append(_rect(51, 59, 106, 112, "#E8E6E0"))

    # harmonic
    p.append(_rect(26.15, 38, 60, 74, "#8A94A6"))     # CS body (space at 0°)
    p.append(_rect(fs_inner, fs_tip, 61, 73, "#AEB9C8"))  # FS tooth band
    p.append(_rect(fs_inner, fs_root, 73, 84, "#AEB9C8"))  # FS cup wall
    p.append(_rect(16, fs_root, 82, 87, "#AEB9C8"))   # FS diaphragm (Ø32 hub bore)
    p.append(_rect(16, 23.5, 82, 87, "#AEB9C8"))      # FS hub
    p.append(_rect(wg_race_in, wg_race_out, 61, 73, "#DCE1E8"))  # WG race
    p.append(_rect(10, wg_cam, 61, 73, "#C08A3E"))    # WG cam
    p.append(_circle(wg_ball, 67, 1.25, "#DCE1E8"))   # WG ball

    # output flange / CRB / encoders / cap
    p.append(_rect(22, 23.5, 85, 87, "#D9E0E8"))       # Ø44 spigot ring
    p.append(_rect(10, 24, 87, 92, "#D9E0E8"))
    p.append(_rect(10, 41, 92, 93, "#D9E0E8"))         # rotating CRB shoulder
    p.append(_rect(10, 35, 93, 106, "#D9E0E8"))
    p.append(_rect(10, 37, 106, 110, "#D9E0E8"))
    p.append(_rect(10, 41, 110, 122, "#D9E0E8"))
    p.append(_rect(10, 21, 118, 122, "#FBFAF7", 1.0, "none", 0))  # pilot recess
    p.append(_rect(27.2, 36.8, 117.5, 122, "#FBFAF7", 1.0, "none", 0))  # M5 counterbore
    p.append(_rect(18, 19.7, 87, 93, "#FBFAF7", 1.0, "none", 0))  # FS bolt
    p.append(_rect(44, 50, 93, 106, "#DCE1E8"))       # CRB outer
    p.append(_rect(35, 41, 93, 106, "#DCE1E8"))       # CRB inner
    p.append(_circle(42.5, 99.5, 2.0, "#DCE1E8"))     # CRB roller
    p.append(_rect(37, 39, 106, 110, "#5A5F68"))      # output ring
    p.append(_rect(40, 52, 108, 109.6, "#1F6B3A", 0.9))  # output PCB
    p.append(_rect(43, 51, 106, 112, "#E8E6E0"))      # cap tube
    p.append(_rect(43, 59, 112, 120, "#E8E6E0"))      # cap flange
    p.append(_rect(40, 51, 108, 111, "#FBFAF7", 1.0, "none", 0))  # cap window
    p.append(_rect(51, 59, 108, 111, "#FBFAF7", 1.0, "none", 0))  # body window
    p.append(_rect(46, 50, 114, 120, "#FBFAF7", 1.0, "none", 0))  # M4
    p.append(_rect(53, 57, 112, 120, "#FBFAF7", 1.0, "none", 0))  # M3

    # labels, ordered by anchor height so the orthogonal leaders do not cross
    label_rows = [
        (55, 116, "输出盖 Ø118 · 8×M4 PCD96"),
        (35, 116, "输出法兰 Ø82 · PCD Ø64"),
        (48, 114, "输出止口 Ø42 · 总长 122"),
        (45, 109, "输出端绝对值编码器"),
        (47, 100, "交叉滚子轴承 RB7013"),
        (fs_tip, 78, "柔轮 Zf=100"),
        (32, 67, "刚轮 Zc=102 · i=50:1"),
        (15, 67, "波发生器（椭圆）"),
        (50, 40, "散热壳体 Ø110 / 法兰 Ø118"),
        (12, 34, "空心输入轴 Ø20"),
        (40, 30, "无框电机定子 + 铜绕组"),
        (31, 30, "转子磁钢 + 碳纤维护套"),
        (20, 6.5, "输入端绝对值编码器"),
    ]
    for index, (r, z, text) in enumerate(label_rows):
        p.append(
            _label(
                r,
                z,
                112,
                32 + index * 8,
                text,
                lane=94 + index * 1.25,
            )
        )

    # dimensions
    p.append(_text(30, 171.5, "Ø110 机身 / Ø118 安装法兰", 3.6, "#5B6B7A"))
    p.append(_text(30, 177.5, "Ø20 通孔 · Ø82 输出法兰 · PCD Ø64", 3.6, "#5B6B7A"))
    p.append(
        '<line x1="20.00" y1="43.00" x2="20.00" y2="165.00" '
        'stroke="#5B6B7A" stroke-width="0.5" '
        'marker-start="url(#arrow-st)" marker-end="url(#arrow-st)"/>'
    )
    p.append(
        '<text x="17.00" y="104.00" font-size="4.0" fill="#5B6B7A" '
        'text-anchor="middle" transform="rotate(-90 17 104)">总长 122</text>'
    )

    if teaching:
        p.append(
            '<polyline points="'
            + " ".join(
                f"{_x(r):.2f},{_y(z):.2f}"
                for r, z in ((15, 33), (15, 55), (21.8, 67), (25.5, 67), (20, 88), (32, 116))
            )
            + '" fill="none" stroke="#C2652A" stroke-width="1.1" marker-end="url(#arrow-cu)"/>'
        )
        p.append(
            '<polyline points="'
            + " ".join(
                f"{_x(r):.2f},{_y(z):.2f}"
                for r, z in ((30, 67), (45, 67), (52, 100), (55, 116))
            )
            + '" fill="none" stroke="#5B6B7A" stroke-width="1.0" marker-end="url(#arrow-st)"/>'
        )
        p.append(_text(113, 134, "长轴啮合", 4.2, "#C2652A", "700"))
        p.append(_text(113, 139, "短轴脱开（另一侧）", 3.8, "#5B6B7A"))
        p.append(_text(80, 112, "扭矩路径", 4.0, "#C2652A", "700"))
        p.append(_text(70, 104, "反力路径", 4.0, "#5B6B7A", "700"))
        p.append(_text(113, 145, "齿部按安装变形状态示意；壳体外廓为严格投影", 3.8, "#8A6A4A"))
    else:
        p.append(_text(113, 142, "中性状态 · 圆柔轮 / 中性波发生器", 4.0, "#5B6B7A"))

    p.append(
        '<defs>'
        '<marker id="arrow-cu" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">'
        '<path d="M0,0 L6,3 L0,6 z" fill="#C2652A"/></marker>'
        '<marker id="arrow-st" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">'
        '<path d="M0,0 L6,3 L0,6 z" fill="#5B6B7A"/></marker>'
        "</defs>"
    )
    p.append('<rect x="110" y="148" width="120" height="26" fill="#F2F0EB" stroke="#B8B2A8" stroke-width="0.4"/>')
    p.append(_text(113, 155, "HA-110 谐波关节模组", 4.6, "#1F2328", "700"))
    p.append(_text(113, 161, "轴向剖面 · 50:1 基准 · 单位 mm", 3.8, "#5B6B7A"))
    p.append(_text(113, 167, "Zf=100 · Zc=102 · i=50:1 · Ø110/Ø118", 3.8, "#5B6B7A"))
    p.append(_text(113, 172, "结构原理示意，最终参数以正式规格书为准", 3.4, "#8A6A4A"))
    p.append("</svg>")
    return "\n".join(p)


def draw_sections(p: ActuatorParams = DEFAULT) -> tuple[Path, Path]:
    DRAWINGS.mkdir(parents=True, exist_ok=True)
    WEB_ASSETS.mkdir(parents=True, exist_ok=True)
    teaching = DRAWINGS / "harmonic_actuator_section_teaching.svg"
    neutral = DRAWINGS / "harmonic_actuator_section_neutral.svg"
    teaching.write_text(_svg(True), encoding="utf-8")
    neutral.write_text(_svg(False), encoding="utf-8")
    web = WEB_ASSETS / "harmonic_actuator_section_teaching.svg"
    web.write_text(teaching.read_text(encoding="utf-8"), encoding="utf-8")
    print(f"teaching: {teaching} ({teaching.stat().st_size / 1024:.1f} KB)")
    print(f"neutral: {neutral} ({neutral.stat().st_size / 1024:.1f} KB)")
    print(f"web: {web} ({web.stat().st_size / 1024:.1f} KB)")
    return teaching, neutral


if __name__ == "__main__":
    draw_sections()
