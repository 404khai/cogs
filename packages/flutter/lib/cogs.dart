/// Cogs avatars for Flutter: twenty machined chassis, twelve expressions and eight display modes,
/// painted with [CustomPainter] from cog JSON (`cogs/unit@1`).
library;

import 'package:flutter/rendering.dart' show CustomPainter;

export 'src/chassis.dart' show Chassis, Optics, Pt, StatusLight, VisorRect, chassisById, chassisList, gearPoints, roundedPoly;
export 'src/cog.dart';
export 'src/color.dart' show hexColor, luminance, shade;
export 'src/config.dart';
export 'src/expressions.dart';
export 'src/gears.dart';
export 'src/painter.dart' show CogFrame, CogPainter, paintCog;
export 'src/svg_path.dart' show pathBounds, svgBounds, svgPath;
