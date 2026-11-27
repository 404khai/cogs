import 'dart:math' as math;
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/animation.dart' show Curves;
import 'package:flutter/foundation.dart' show ValueListenable;
import 'package:flutter/rendering.dart';

import 'chassis.dart';
import 'color.dart';
import 'config.dart';
import 'expressions.dart';
import 'gears.dart';
import 'svg_path.dart';

/// The moving parts of a cog at one instant.
class CogFrame {
  const CogFrame({required this.l, required this.r, this.gaze = Offset.zero, this.blink = 0, this.time = 0});

  /// The resting frame for an expression: eyes centred, open, at time zero.
  factory CogFrame.still(Expression e) => CogFrame(l: e.L, r: e.R);

  /// Left and right eye parameters (a mono visor uses [l]).
  final EyeP l, r;

  /// Where the eyes look, each axis about -1..1.
  final Offset gaze;

  /// Lid closure, 0 (open) to 1 (shut).
  final double blink;

  /// Seconds into the display-mode and status-light animations.
  final double time;
}

/// Paints a cog into its box (a 400 × 400 design, centred and scaled to fit), layer for layer
/// like the web studio's SVG: body, bevel, fasteners, recess, status light, visor and screen.
class CogPainter extends CustomPainter {
  /// A still cog: [frame], or [expression] (default: the config's) at rest.
  CogPainter({required this.config, CogFrame? frame, String? expression})
      : _still = frame ?? CogFrame.still(expressionById(expression ?? config.expression)),
        _frames = null;

  /// A moving cog: repaints whenever [frames] changes, without rebuilding the widget.
  CogPainter.live({required this.config, required ValueListenable<CogFrame> frames})
      : _still = null,
        _frames = frames,
        super(repaint: frames);

  final CogConfig config;
  final CogFrame? _still;
  final ValueListenable<CogFrame>? _frames;

  CogFrame get frame => _frames?.value ?? _still!;

  @override
  void paint(Canvas canvas, Size size) {
    final s = math.min(size.width, size.height) / 400;
    canvas.save();
    canvas.translate((size.width - 400 * s) / 2, (size.height - 400 * s) / 2);
    canvas.scale(s);
    paintCog(canvas, config, frame);
    canvas.restore();
  }

  @override
  bool shouldRepaint(CogPainter old) => old.config != config || old._frames != _frames || !identical(old._still, _still);
}

// ── helpers ─────────────────────────────────────────────

Color _c(String hex, [double o = 1]) => hexColor(hex, o);
const _white = Color(0xffffffff);
Color _w(double o) => _white.withValues(alpha: o);

/// An SVG `<rect rx>`: radii clamp to half the width and height independently.
RRect _rr(double x, double y, double w, double h, double r) =>
    RRect.fromRectAndRadius(Rect.fromLTWH(x, y, w, h), Radius.elliptical(math.min(r, w / 2), math.min(r, h / 2)));

Float64List _bboxMatrix(Rect b) => Float64List.fromList([b.width, 0, 0, 0, 0, b.height, 0, 0, 0, 0, 1, 0, b.left, b.top, 0, 1]);

/// A linear gradient in SVG objectBoundingBox units over [b].
Shader _linear(Rect b, Offset from, Offset to, List<Color> colors, List<double> stops) =>
    ui.Gradient.linear(from, to, colors, stops, TileMode.clamp, _bboxMatrix(b));

/// A radial gradient in SVG objectBoundingBox units over [b] (elliptical for a non-square box).
Shader _radial(Rect b, Offset c, double r, List<Color> colors, List<double> stops) => ui.Gradient.radial(c, r, colors, stops, TileMode.clamp, _bboxMatrix(b));

double _frac(double x) => x - x.floorToDouble();

// ── the cog ─────────────────────────────────────────────

/// Paints [config] into a 400 × 400 canvas.
void paintCog(Canvas canvas, CogConfig config, CogFrame frame) {
  final ch = chassisById(config.chassis);
  final optics = switch (config.optics) {
    OpticsMode.auto => ch.optics,
    OpticsMode.mono => Optics.mono,
    OpticsMode.dual => Optics.dual,
  };
  final c = config.color;
  final lum = luminance(c);
  final v = ch.visor;
  final li = ch.light;
  final lcx = li.x + li.w / 2;
  final lcy = li.y + li.h / 2;
  const pad = 11.0;
  // Light sits directly above the visor → cut it into a notch of the visor recess (as on the reference bots).
  const lpad = 7.0;
  final tab = li.angle == null && li.w > li.h && li.x >= v.x && li.x + li.w <= v.x + v.w && v.y - pad - (li.y + li.h) < 30
      ? (x: li.x - lpad, y: li.y - lpad, w: li.w + lpad * 2, h: v.y - (li.y - lpad), r: li.h / 2 + lpad)
      : null;
  final recessTop = tab != null ? tab.y : v.y - pad;
  // A light below the visor (Lynx) still takes this branch on the web, with a negative height
  // that SVG skips drawing; it keeps the light's own rim off and moves the rim gradient. Same here.
  final notch = tab != null && tab.h > 0 ? _rr(tab.x, tab.y, tab.w, tab.h, tab.r) : null;
  final body = svgPath(ch.path);
  final bb = svgBounds(ch.path);

  // contact shadow
  final sy = math.min(ch.box[3] + 34.0, 382.0);
  canvas.drawOval(
    Rect.fromCenter(center: Offset(200, sy), width: (ch.box[2] - ch.box[0]) * 0.72, height: 18),
    Paint()
      ..color = _c(shade(c, -0.4), 0.22)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 8),
  );

  // body, with its drop shadow
  canvas.drawPath(
    body.shift(const Offset(0, 16)),
    Paint()
      ..color = _c(shade(c, -0.35), lum > 0.7 ? 0.3 : 0.38)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 14),
  );
  canvas.drawPath(
    body,
    Paint()..shader = _linear(bb, const Offset(0.15, 0), const Offset(0.55, 1), [_c(shade(c, 0.1, 0.04)), _c(c), _c(shade(c, -0.1, 0.02))], const [0, 0.45, 1]),
  );

  // bevel: sheen, a lit lower edge and a shaded upper one, clipped to the body
  canvas.save();
  canvas.clipPath(body);
  canvas.drawPath(body, Paint()..shader = _linear(bb, Offset.zero, const Offset(1, 1), [_w(0.32), _w(0)], const [0, 0.4]));
  final stroke = Paint()
    ..style = PaintingStyle.stroke
    ..strokeWidth = 6;
  canvas.drawPath(body.shift(const Offset(0, 3)), stroke..color = _w(lum > 0.75 ? 0.9 : 0.55));
  canvas.drawPath(body.shift(const Offset(0, -3)), stroke..color = _c(shade(c, -0.3), 0.35));
  canvas.restore();

  // fasteners
  for (final (x, y) in ch.screws) {
    canvas.drawCircle(Offset(x, y + 1), 7.2, Paint()..color = _w(lum > 0.75 ? 0.8 : 0.4));
    canvas.drawCircle(Offset(x, y), 6.6, Paint()..color = _c(shade(c, -0.52)));
    canvas.drawCircle(Offset(x - 1.2, y - 1.4), 2.2, Paint()..color = _c(shade(c, -0.3)));
  }

  // recess: visor rim, merged with a notch for the status light when it sits right above
  final rim = _rr(v.x - pad, v.y - pad, v.w + pad * 2, v.h + pad * 2, v.r + pad);
  void recess(Paint p) {
    canvas.drawRRect(rim, p);
    if (notch != null) canvas.drawRRect(notch, p);
  }

  canvas.saveLayer(null, Paint()..color = _w(lum > 0.75 ? 1 : 0.7));
  canvas.translate(0, 1.4);
  recess(Paint()..color = _c(shade(c, 0.2)));
  canvas.restore();
  recess(Paint()
    ..shader = ui.Gradient.linear(
        Offset(0, recessTop), Offset(0, v.y + v.h + pad), [_c(shade(c, -0.15)), _c(shade(c, -0.06)), _c(shade(c, 0.05))], const [0, 0.5, 1]));

  // status light
  canvas.save();
  if (li.angle != null) {
    canvas.translate(lcx, lcy);
    canvas.rotate(li.angle! * math.pi / 180);
    canvas.translate(-lcx, -lcy);
  }
  if (tab == null) {
    final ring = _rr(li.x - 6, li.y - 6, li.w + 12, li.h + 12, (math.min(li.w, li.h) + 12) / 2);
    canvas.drawRRect(ring.shift(const Offset(0, 1.2)), Paint()..color = _c(shade(c, 0.2), lum > 0.75 ? 1 : 0.7));
    canvas.drawRRect(ring, Paint()..shader = _linear(ring.outerRect, Offset.zero, const Offset(0, 1), [_c(shade(c, -0.14)), _c(shade(c, 0.06))], const [0, 1]));
  }
  final led = _rr(li.x, li.y, li.w, li.h, math.min(li.w, li.h) / 2);
  // Pulses 1 → 0.72 → 1 every 3.2s.
  final pulse = 1 - 0.28 * (1 - (2 * _frac(frame.time / 3.2) - 1).abs());
  canvas.saveLayer(null, Paint()..color = _w(pulse));
  final halo = Paint()
    ..color = _c(config.glow, 0.4 + 0.6 * config.charge)
    ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 4);
  canvas.drawRRect(led, halo);
  canvas.drawRRect(led, halo);
  canvas.drawRRect(led, Paint()..color = _c(shade(config.glow, 0.38)));
  canvas.restore();
  canvas.restore();

  // visor
  canvas.drawRRect(_rr(v.x - 2, v.y - 2, v.w + 4, v.h + 4, v.r + 2), Paint()..color = _c(shade(c, -0.45), 0.5));
  final screen = _rr(v.x, v.y, v.w, v.h, v.r);
  canvas.drawRRect(
    screen,
    Paint()
      ..shader =
          _linear(screen.outerRect, Offset.zero, const Offset(0, 1), const [Color(0xff10161d), Color(0xff030507), Color(0xff06090c)], const [0, 0.35, 1]),
  );

  canvas.save();
  canvas.clipRRect(screen);
  paintVisor(canvas, v, optics, frame, glow: config.glow, charge: config.charge, pupils: config.pupils, mode: config.screen);
  final gloss = _rr(v.x + v.r * 0.4, v.y + 3, v.w - v.r * 0.8, v.h * 0.16, v.h * 0.08);
  canvas.drawRRect(gloss, Paint()..shader = _linear(gloss.outerRect, Offset.zero, const Offset(0, 1), [_w(0.22), _w(0)], const [0, 1]));
  canvas.restore();
}

// ── the visor ───────────────────────────────────────────

class _Slot {
  const _Slot(this.cx, this.cy, this.w, this.h, this.side);
  final double cx, cy, w, h, side;
}

List<_Slot> _slots(VisorRect v, Optics optics) {
  final cx = v.x + v.w / 2;
  final cy = v.y + v.h / 2;
  if (optics == Optics.mono) {
    final s = math.min(v.w * 0.6, v.h * 0.68);
    return [_Slot(cx, cy, s, s, 1)];
  }
  final w = math.min(v.w * 0.33, v.h * 0.78);
  final h = v.h * 0.66;
  final dx = math.min(v.w * 0.2, w * 0.62);
  return [_Slot(cx - dx, cy, w, h, -1), _Slot(cx + dx, cy, w, h, 1)];
}

const _robot = [
  '.....#.....',
  '....###....',
  '..#######..',
  '..#.....#..',
  '..#.#.#.#..',
  '..#.....#..',
  '..#######..',
  '....#.#....',
  '..#######..',
  '.#.......#.',
  '#.........#',
];

/// The LED fill, dot-matrix grain and colours of one visor.
class _Leds {
  _Leds(this.glow, this.unit) : lit = _c(shade(glow, 0.28));
  final String glow;
  final double unit;
  final Color lit;

  Shader fill(Rect b) => _radial(b, const Offset(0.5, 0.45), 0.65, [_white, _c(shade(glow, 0.22)), _c(glow)], const [0, 0.45, 1]);

  Paint fillPaint(Rect b, [double opacity = 1]) => Paint()
    ..shader = fill(b)
    ..color = _w(opacity);

  /// The `dots` pattern: a 3.4-unit grid of soft white points, anchored at the canvas origin.
  void dots(Canvas canvas, Rect b) {
    final p = 3.4 * unit;
    final pts = <double>[];
    for (var x = (b.left / p).floorToDouble() * p + 1.7 * unit; x < b.right + p; x += p) {
      for (var y = (b.top / p).floorToDouble() * p + 1.7 * unit; y < b.bottom + p; y += p) {
        pts
          ..add(x)
          ..add(y);
      }
    }
    canvas.drawRawPoints(
      ui.PointMode.points,
      Float32List.fromList(pts),
      Paint()
        ..color = _w(0.55)
        ..strokeWidth = 1.9 * unit
        ..strokeCap = StrokeCap.round,
    );
  }
}

/// Paints the lit contents of a visor: eyes or one of the display modes.
void paintVisor(Canvas canvas, VisorRect v, Optics optics, CogFrame frame,
    {required String glow, required double charge, required bool pupils, required ScreenMode mode}) {
  final cx = v.x + v.w / 2;
  final cy = v.y + v.h / 2;
  final unit = v.h / 100;
  final blur = (1.5 + charge * 4.5) * unit;
  final leds = _Leds(glow, unit);
  final t = frame.time;

  void content(Canvas canvas) {
    switch (mode) {
      case ScreenMode.eyes:
        final ss = _slots(v, optics);
        for (var i = 0; i < ss.length; i++) {
          _eye(canvas, ss[i], ss.length == 1 || i == 0 ? frame.l : frame.r, frame, pupils, leds);
        }
      case ScreenMode.glyph:
        final n = _robot.length;
        final cell = (v.h * 0.78) / n;
        final ox = cx - (cell * n) / 2;
        final oy = cy - (cell * n) / 2;
        for (var y = 0; y < n; y++) {
          for (var x = 0; x < _robot[y].length; x++) {
            if (_robot[y][x] != '#') continue;
            final r = _rr(ox + x * cell + cell * 0.1, oy + y * cell + cell * 0.1, cell * 0.8, cell * 0.8, cell * 0.2);
            canvas.drawRRect(r, leds.fillPaint(r.outerRect));
          }
        }
      case ScreenMode.wave:
        const n = 9;
        final bw = v.w * 0.035;
        final gap = bw * 0.9;
        final total = n * bw + (n - 1) * gap;
        for (var i = 0; i < n; i++) {
          final h = v.h * (0.22 + 0.5 * math.sin(((i + 1) / (n + 1)) * math.pi));
          final bar = _rr(cx - total / 2 + i * (bw + gap), cy - h / 2, bw, h, bw / 2);
          // CSS: scaleY 0.25 ↔ 1, ease-in-out, alternate, each bar on its own period and offset.
          final dur = 0.7 + (i % 3) * 0.18;
          final tt = (t + i * 0.13) / dur;
          final p = tt.floor().isOdd ? 1 - _frac(tt) : _frac(tt);
          final k = 0.25 + 0.75 * Curves.easeInOut.transform(p);
          canvas.save();
          canvas.translate(0, cy);
          canvas.scale(1, k);
          canvas.translate(0, -cy);
          canvas.drawRRect(bar, leds.fillPaint(bar.outerRect));
          canvas.restore();
        }
      case ScreenMode.dots:
        final r = v.h * 0.085;
        for (final k in [-1, 0, 1]) {
          // CSS: up 9 and to full brightness at 30%, back by 60%, every 1.1s after a staggered start.
          final tt = t - (k + 1) * 0.16;
          var dy = 0.0, op = 1.0;
          if (tt >= 0) {
            final p = _frac(tt / 1.1);
            final up = p < 0.3
                ? Curves.easeInOut.transform(p / 0.3)
                : p < 0.6
                    ? 1 - Curves.easeInOut.transform((p - 0.3) / 0.3)
                    : 0.0;
            dy = -9 * up;
            op = 0.55 + 0.45 * up;
          }
          final o = Offset(cx + k * r * 3.2, cy + dy);
          canvas.drawCircle(o, r, leds.fillPaint(Rect.fromCircle(center: o, radius: r), op));
        }
      case ScreenMode.think:
        _think(canvas, v, cx, cy, t, leds);
      case ScreenMode.search:
        _search(canvas, v, cx, cy, unit, t, leds);
      case ScreenMode.code:
        _code(canvas, v, cx, unit, t, leds);
      case ScreenMode.work:
        _work(canvas, v, cx, cy, t, leds);
    }
  }

  canvas.saveLayer(null, Paint()..color = _w(0.35 + 0.65 * math.min(1, charge * 1.4)));
  final amb = Rect.fromCenter(center: Offset(cx, cy), width: v.w * 1.1, height: v.h * 1.2);
  canvas.drawOval(amb, Paint()..shader = _radial(amb, const Offset(0.5, 0.5), 0.5, [_c(glow, 0.32 * charge), _c(glow, 0)], const [0, 1]));
  // The glow filter: the content blurred, merged twice, under the content itself.
  final bloom = Paint()..imageFilter = ui.ImageFilter.blur(sigmaX: blur, sigmaY: blur);
  for (var i = 0; i < 2; i++) {
    canvas.saveLayer(null, bloom);
    content(canvas);
    canvas.restore();
  }
  content(canvas);
  canvas.restore();
}

void _eye(Canvas canvas, _Slot slot, EyeP p, CogFrame f, bool pupils, _Leds leds) {
  final cx = slot.cx, cy = slot.cy;
  final w = slot.w * p.sx;
  final h = slot.h * p.sy;
  final x0 = cx - w / 2;
  final y0 = cy - h / 2;
  final r = math.min(w, h) * p.rx;
  final topY = y0 + p.top * h;
  final pr = math.min(w, h) * 0.21 * p.ps;
  final gx = (p.px + f.gaze.dx).clamp(-1.0, 1.0);
  final gy = (p.py + f.gaze.dy).clamp(-1.0, 1.0);
  final pcx = cx + gx * (w / 2 - pr * 1.05);
  final pcy = cy + gy * (h / 2 - pr * 1.05);
  // Eye shifts slightly with gaze, too, so the whole face feels alive.
  final ox = f.gaze.dx * slot.w * 0.06;
  final oy = f.gaze.dy * slot.h * 0.05;
  final sy = 1 - f.blink * 0.94;

  // The mask: the eye's rounded rect, minus the upper lid (tilted), the lower lid and the cheek.
  var mask = Path()..addRRect(_rr(x0, y0, w, h, r));
  if (p.top > 0.005) {
    final a = -p.tilt * slot.side * math.pi / 180;
    final ca = math.cos(a), sa = math.sin(a);
    Offset rot(double x, double y) => Offset(cx + (x - cx) * ca - (y - topY) * sa, topY + (x - cx) * sa + (y - topY) * ca);
    final lx = cx - w * 1.5, ly = topY - h * 2;
    final lid = Path()..addPolygon([rot(lx, ly), rot(lx + w * 3, ly), rot(lx + w * 3, topY), rot(lx, topY)], true);
    mask = Path.combine(PathOperation.difference, mask, lid);
  }
  if (p.bottom > 0.005) {
    mask = Path.combine(PathOperation.difference, mask, Path()..addRect(Rect.fromLTWH(cx - w * 1.5, y0 + h - p.bottom * h, w * 3, h * 2)));
  }
  if (p.cheek > 0.005) {
    final cheek = Rect.fromCenter(center: Offset(cx, y0 + h * 1.5 - p.cheek * h * 0.95), width: w * 1.6, height: h * 1.24);
    mask = Path.combine(PathOperation.difference, mask, Path()..addOval(cheek));
  }

  canvas.save();
  canvas.translate(ox, oy);
  canvas.translate(cx, cy);
  canvas.scale(1, sy);
  canvas.translate(-cx, -cy);
  canvas.clipPath(mask);
  final box = Rect.fromLTWH(x0, y0, w, h);
  canvas.drawRect(box, Paint()..shader = leds.fill(box));
  leds.dots(canvas, box);
  if (pupils && pr > 0.5) canvas.drawCircle(Offset(pcx, pcy), pr, Paint()..color = const Color(0xe603121a));
  canvas.restore();
}

/// A light chases round a ring of LEDs, a breathing core and three counter-orbiting satellites.
void _think(Canvas canvas, VisorRect v, double cx, double cy, double t, _Leds leds) {
  final r = v.h * 0.3;
  const n = 12;
  const dur = 1.2;
  for (var i = 0; i < n; i++) {
    final a = (i / n) * math.pi * 2 - math.pi / 2;
    // SMIL: 1 → 0.15 over the first 60% of each cycle, then hold; LED i starts i/n of a cycle in.
    final p = _frac((t - ((i / n) * dur - dur)) / dur);
    final op = p < 0.6 ? 1 - 0.85 * (p / 0.6) : 0.15;
    canvas.drawCircle(Offset(cx + r * math.cos(a), cy + r * math.sin(a)), v.h * 0.045, Paint()..color = leds.lit.withValues(alpha: op));
  }
  final breathe = 1 - (2 * _frac(t / 1.6) - 1).abs();
  final core = v.h * (0.07 + 0.045 * breathe);
  final o = Offset(cx, cy);
  canvas.drawCircle(o, core, leds.fillPaint(Rect.fromCircle(center: o, radius: core)));
  final spin = (1 - _frac(t / 3.6)) * math.pi * 2;
  for (var k = 0; k < 3; k++) {
    final a = (k / 3) * math.pi * 2 + spin;
    canvas.drawCircle(Offset(cx + r * 0.58 * math.cos(a), cy + r * 0.58 * math.sin(a)), v.h * 0.028, Paint()..color = leds.lit.withValues(alpha: 0.75));
  }
}

/// Radar: a sweeping beam with a fading wake; blips flare as the beam passes them.
void _search(Canvas canvas, VisorRect v, double cx, double cy, double unit, double t, _Leds leds) {
  final r = v.h * 0.38;
  const dur = 2.4;
  const wake = (-55 * math.pi) / 180;
  final sw = unit * 1.3;
  final o = Offset(cx, cy);
  Paint line(double op, double width) => Paint()
    ..style = PaintingStyle.stroke
    ..color = leds.lit.withValues(alpha: op)
    ..strokeWidth = width;
  canvas.drawCircle(o, r, line(0.6, sw * 1.2));
  canvas.drawCircle(o, r * 0.55, line(0.4, sw));
  canvas.drawLine(Offset(cx - r, cy), Offset(cx + r, cy), line(0.28, sw));
  canvas.drawLine(Offset(cx, cy - r), Offset(cx, cy + r), line(0.28, sw));

  canvas.save();
  canvas.translate(cx, cy);
  canvas.rotate(_frac(t / dur) * math.pi * 2);
  canvas.translate(-cx, -cy);
  final beam = Path()
    ..moveTo(cx, cy)
    ..lineTo(cx + r, cy)
    ..arcToPoint(Offset(cx + r * math.cos(wake), cy + r * math.sin(wake)), radius: Radius.circular(r), clockwise: false)
    ..close();
  canvas.drawPath(beam, Paint()..color = leds.lit.withValues(alpha: 0.38));
  canvas.drawLine(
      o,
      Offset(cx + r, cy),
      Paint()
        ..color = _white
        ..strokeWidth = sw * 1.4
        ..strokeCap = StrokeCap.round);
  canvas.restore();

  for (final (deg, d) in const [(38, 0.72), (150, 0.45), (255, 0.82), (312, 0.32)]) {
    final a = (deg * math.pi) / 180;
    final begin = (deg / 360) * dur;
    final op = t < begin ? 0.08 : 1 - 0.92 * _frac((t - begin) / dur);
    final b = Offset(cx + r * d * math.cos(a), cy + r * d * math.sin(a));
    canvas.drawCircle(b, unit * 4.2, leds.fillPaint(Rect.fromCircle(center: b, radius: unit * 4.2), op));
  }
  canvas.drawCircle(o, unit * 2.4, Paint()..color = _white);
}

/// A terminal: dot-matrix code scrolls up, a prompt waits at the bottom with a blinking block cursor.
void _code(Canvas canvas, VisorRect v, double cx, double unit, double t, _Leds leds) {
  const rows = [
    [0.0, 0.22, 0.4],
    [0.1, 0.3],
    [0.1, 0.16, 0.24, 0.12],
    [0.2, 0.36],
    [0.1, 0.2],
    [0.0, 0.08],
  ];
  final rowH = v.h * 0.13;
  final tw = math.min(v.w * 0.72, v.h * 1.4);
  final x0 = cx - tw / 2;
  final block = rows.length * rowH;
  final top = v.y + v.h * 0.14;
  final bh = rowH * 0.42;
  final promptY = v.y + v.h * 0.8;

  canvas.save();
  canvas.clipRect(Rect.fromLTWH(v.x, v.y, v.w, v.h * 0.66));
  canvas.translate(0, -block * _frac(t / (rows.length * 0.6)));
  for (final copy in [-1, 0, 1, 2]) {
    for (var i = 0; i < rows.length; i++) {
      final row = rows[i];
      final y = top + (copy * rows.length + i) * rowH;
      var x = x0 + row[0] * tw;
      for (var j = 1; j < row.length; j++) {
        final w = row[j] * tw;
        canvas.drawRRect(_rr(x, y, w, bh, bh / 2), Paint()..color = j == 1 ? _w(0.95) : leds.lit.withValues(alpha: 0.7));
        x += w + bh * 0.9;
      }
    }
  }
  canvas.restore();

  canvas.drawPath(
    Path()
      ..moveTo(x0, promptY - bh * 0.7)
      ..lineTo(x0 + bh * 0.8, promptY)
      ..lineTo(x0, promptY + bh * 0.7),
    Paint()
      ..style = PaintingStyle.stroke
      ..color = leds.lit
      ..strokeWidth = unit * 2.4
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round,
  );
  if (_frac(t) < 0.5) {
    canvas.drawRRect(_rr(x0 + bh * 2, promptY - rowH * 0.36, rowH * 0.42, rowH * 0.72, unit), Paint()..color = _white);
  }
}

final _train = meshChain(1, (z: 12, cx: 0, cy: 0), [(z: 8, deg: -32), (z: 10, deg: 48)]);

/// Working: a train of solid LED gears meshing and turning, sized to fit any visor.
void _work(Canvas canvas, VisorRect v, double cx, double cy, double t, _Leds leds) {
  final bx0 = _train.map((g) => g.cx - g.z / 2 - 1).reduce(math.min);
  final bx1 = _train.map((g) => g.cx + g.z / 2 + 1).reduce(math.max);
  final by0 = _train.map((g) => g.cy - g.z / 2 - 1).reduce(math.min);
  final by1 = _train.map((g) => g.cy + g.z / 2 + 1).reduce(math.max);
  final m = math.min((v.w * 0.84) / (bx1 - bx0), (v.h * 0.84) / (by1 - by0));
  final ox = cx - ((bx0 + bx1) / 2) * m;
  final oy = cy - ((by0 + by1) / 2) * m;
  const hole = Color(0xff04070a);
  for (final MeshGear g in _train) {
    final gx = ox + g.cx * m;
    final gy = oy + g.cy * m;
    final pitch = (m * g.z) / 2;
    final body = svgPath(roundedPoly(gearPoints(gx, gy, g.z, pitch - m * 1.2, pitch + m, g.phase), m * 0.25));
    final holes = g.z >= 10 ? 4 : 0;
    canvas.save();
    canvas.translate(gx, gy);
    canvas.rotate(g.dir * _frac(t / (g.z * 0.32)) * math.pi * 2);
    canvas.translate(-gx, -gy);
    final b = Rect.fromCircle(center: Offset(gx, gy), radius: pitch + m);
    canvas.drawPath(body, Paint()..shader = leds.fill(b));
    canvas.save();
    canvas.clipPath(body);
    leds.dots(canvas, b);
    canvas.restore();
    for (var k = 0; k < holes; k++) {
      final a = g.phase + (k / holes) * math.pi * 2 + math.pi / holes;
      canvas.drawCircle(Offset(gx + math.cos(a) * pitch * 0.55, gy + math.sin(a) * pitch * 0.55), pitch * 0.15, Paint()..color = hole);
    }
    canvas.drawCircle(Offset(gx, gy), pitch * 0.24, Paint()..color = hole);
    canvas.drawCircle(Offset(gx, gy), pitch * 0.09, Paint()..color = leds.lit);
    canvas.restore();
  }
}
