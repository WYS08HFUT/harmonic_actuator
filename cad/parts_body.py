"""Main body housing: motor bore, front web, CS seat, CRB seat, output boss."""

import build123d as bd
from build123d import Align, Box, BuildPart, Cylinder, Locations, Mode, PolarLocations

from cad.params import ActuatorParams

C = Align.CENTER
MIN = Align.MIN


def build_body_housing(p: ActuatorParams) -> bd.Part:
    """One-piece 6061/7075 body from Z10 to Z112.

    Internal stations:
      Z10–51   Ø92 motor bore
      Z51–58   Ø42 front-bearing web
      Z58–60   Ø52 CS shoulder / Ø26 relief
      Z60–74   Ø76 CS seat
      Z74–93   Ø76 FS/output-flange cavity
      Z93–106  Ø100 CRB seat
      Z106–112 Ø102 output boss
    """
    with BuildPart() as body:
        # Main body Ø110, Z10–106
        with Locations((0, 0, 10.0)):
            Cylinder(55.0, 96.0, align=(C, C, MIN))
        # Output boss Ø118, Z106–112
        with Locations((0, 0, 106.0)):
            Cylinder(59.0, 6.0, align=(C, C, MIN))

        # Internal bores
        with Locations((0, 0, 10.0)):
            Cylinder(46.0, 41.0, align=(C, C, MIN), mode=Mode.SUBTRACT)  # motor
        with Locations((0, 0, 51.0)):
            Cylinder(21.0, 7.0, align=(C, C, MIN), mode=Mode.SUBTRACT)  # front bearing
        with Locations((0, 0, 58.0)):
            Cylinder(26.0, 2.0, align=(C, C, MIN), mode=Mode.SUBTRACT)  # CS relief
        with Locations((0, 0, 60.0)):
            Cylinder(38.0, 14.0, align=(C, C, MIN), mode=Mode.SUBTRACT)  # CS seat
        with Locations((0, 0, 74.0)):
            Cylinder(38.0, 19.0, align=(C, C, MIN), mode=Mode.SUBTRACT)  # FS cavity
        # Relieve the static Z93 shoulder so the CRB inner ring seats only on
        # the rotating output-flange shoulder (r35–41), not on the body.
        with Locations((0, 0, 92.0)):
            Cylinder(42.0, 1.0, align=(C, C, MIN), mode=Mode.SUBTRACT)
        with Locations((0, 0, 93.0)):
            Cylinder(50.0, 13.0, align=(C, C, MIN), mode=Mode.SUBTRACT)  # CRB seat
        with Locations((0, 0, 106.0)):
            Cylinder(51.0, 6.0, align=(C, C, MIN), mode=Mode.SUBTRACT)  # output boss

        # 8×M3 rear end-bell holes, PCD100, from Z10
        with Locations((0, 0, 10.0)):
            with PolarLocations(50.0, 8):
                Cylinder(1.7, 6.0, align=(C, C, MIN), mode=Mode.SUBTRACT)

        # 8×M3 output-cap holes, PCD110, from Z106, clocked 22.5° off the window
        with Locations((0, 0, 106.0)):
            with PolarLocations(55.0, 8, start_angle=22.5):
                Cylinder(1.7, 6.0, align=(C, C, MIN), mode=Mode.SUBTRACT)

        # Output encoder radial window: 20 tangential × 19 radial × 3 axial
        with Locations((49.5, 0.0, 108.0)):
            Box(19.0, 20.0, 3.0, align=(C, C, MIN), mode=Mode.SUBTRACT)
    part = body.part
    part.label = "Body_Housing"
    part.color = "#7D838B"
    return part
