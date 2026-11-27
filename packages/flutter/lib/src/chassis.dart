import 'dart:math' as math;

/// A point in the 400 × 400 cog canvas.
typedef Pt = (double, double);

class VisorRect {
  const VisorRect({required this.x, required this.y, required this.w, required this.h, required this.r});
  final double x, y, w, h, r;
}

class StatusLight {
  const StatusLight({required this.x, required this.y, required this.w, required this.h, this.angle});
  final double x, y, w, h;

  /// Rotation in degrees about the light's centre.
  final double? angle;
}

enum Optics { mono, dual }

/// A body shape: an SVG path in a 400 × 400 viewBox, plus where its visor, status light and screws sit.
class Chassis {
  const Chassis({
    required this.id,
    required this.name,
    required this.code,
    required this.path,
    required this.box,
    required this.visor,
    required this.light,
    required this.screws,
    required this.optics,
  });
  final String id;
  final String name;
  final String code;

  /// Absolute SVG path data (M, L, H, V, Q, A, Z), identical to the web studio's.
  final String path;

  /// Bounding box as `[x0, y0, x1, y1]`.
  final List<int> box;
  final VisorRect visor;
  final StatusLight light;
  final List<Pt> screws;
  final Optics optics;
}

/// Formats a number the way `+n.toFixed(2)` prints in JavaScript.
String fmt(num n) {
  final v = double.parse(n.toStringAsFixed(2));
  if (v == v.roundToDouble()) return v == 0 ? '0' : v.toInt().toString();
  return v.toString();
}

String roundedPoly(List<Pt> pts, double r) {
  final n = pts.length;
  final d = StringBuffer();
  for (var i = 0; i < n; i++) {
    final p0 = pts[(i - 1 + n) % n];
    final p1 = pts[i];
    final p2 = pts[(i + 1) % n];
    final v1 = (p0.$1 - p1.$1, p0.$2 - p1.$2);
    final v2 = (p2.$1 - p1.$1, p2.$2 - p1.$2);
    final l1 = _hypot(v1.$1, v1.$2);
    final l2 = _hypot(v2.$1, v2.$2);
    final rr = math.min(r, math.min(l1 / 2, l2 / 2));
    final a = (p1.$1 + (v1.$1 / l1) * rr, p1.$2 + (v1.$2 / l1) * rr);
    final b = (p1.$1 + (v2.$1 / l2) * rr, p1.$2 + (v2.$2 / l2) * rr);
    d.write('${i == 0 ? 'M' : 'L'}${fmt(a.$1)} ${fmt(a.$2)} Q${fmt(p1.$1)} ${fmt(p1.$2)} ${fmt(b.$1)} ${fmt(b.$2)} ');
  }
  return '${d}Z';
}

double _hypot(double x, double y) => math.sqrt(x * x + y * y);

/// JavaScript's Math.round: halves round towards +∞.
int _jsRound(double n) => (n + 0.5).floor();

List<int> _bbox(List<Pt> pts) {
  final xs = pts.map((p) => p.$1);
  final ys = pts.map((p) => p.$2);
  return [
    _jsRound(xs.reduce(math.min)),
    _jsRound(ys.reduce(math.min)),
    _jsRound(xs.reduce(math.max)),
    _jsRound(ys.reduce(math.max)),
  ];
}

List<Pt> gearPoints(double cx, double cy, int teeth, double rRoot, double rTip, [double phase = -math.pi / 2]) {
  final t = (math.pi * 2) / teeth;
  final pts = <Pt>[];
  Pt at(double r, double a) => (cx + r * math.cos(a), cy + r * math.sin(a));
  for (var i = 0; i < teeth; i++) {
    final c = phase + i * t;
    pts.addAll([at(rRoot, c - 0.3 * t), at(rTip, c - 0.15 * t), at(rTip, c + 0.15 * t), at(rRoot, c + 0.3 * t), at(rRoot, c + 0.5 * t)]);
  }
  return pts;
}

List<Pt> _polarPoints(double cx, double cy, double Function(double a) r, [int samples = 180]) => List.generate(samples, (i) {
      final a = (i / samples) * math.pi * 2;
      return (cx + r(a) * math.cos(a), cy + r(a) * math.sin(a));
    });

List<Pt> _ellipseArc(double cx, double cy, double rx, double ry, double t0, double t1, [int n = 24]) => List.generate(n + 1, (i) {
      final t = ((t0 + ((t1 - t0) * i) / n) * math.pi) / 180;
      return (cx + rx * math.cos(t), cy + ry * math.sin(t));
    });

/// Ellipse with its top and bottom shaved flat, leaving little horns at each cut (a pipe clamp).
final List<Pt> _clampPts = [
  ..._ellipseArc(200, 200, 170, 125, -60, 60),
  (285, 285),
  (115, 285),
  ..._ellipseArc(200, 200, 170, 125, 120, 240),
  (115, 115),
  (285, 115),
];

String _polyPath(List<Pt> pts) => 'M${pts.map((p) => '${fmt(p.$1)} ${fmt(p.$2)}').join(' L')} Z';

/// Hull of two horizontally aligned circles: a teardrop/keyhole plate.
String _dropPath(double c1x, double c2x, double cy, double r1, double r2) {
  final d = c2x - c1x;
  final t = math.acos((r1 - r2) / d);
  final c = math.cos(t);
  final s = math.sin(t);
  final p1a = (c1x + r1 * c, cy - r1 * s);
  final p1b = (c1x + r1 * c, cy + r1 * s);
  final p2a = (c2x + r2 * c, cy - r2 * s);
  final p2b = (c2x + r2 * c, cy + r2 * s);
  return 'M${fmt(p1a.$1)} ${fmt(p1a.$2)} L${fmt(p2a.$1)} ${fmt(p2a.$2)} A${fmt(r2)} ${fmt(r2)} 0 0 1 ${fmt(p2b.$1)} ${fmt(p2b.$2)} '
      'L${fmt(p1b.$1)} ${fmt(p1b.$2)} A${fmt(r1)} ${fmt(r1)} 0 1 1 ${fmt(p1a.$1)} ${fmt(p1a.$2)} Z';
}

Chassis _poly(String id, String name, String code, List<Pt> pts, double r,
        {required VisorRect visor, required StatusLight light, required List<Pt> screws, required Optics optics}) =>
    Chassis(id: id, name: name, code: code, path: roundedPoly(pts, r), box: _bbox(pts), visor: visor, light: light, screws: screws, optics: optics);

/// Ray-cast radius of a union of circles (a centre disc plus petals), giving a scalloped flower outline.
double Function(double) _flowerRadius(int petals, double dist, double petalR, double coreR) => (a) {
      var r = coreR;
      for (var i = 0; i < petals; i++) {
        final d = a - (-math.pi / 2 + (i * math.pi * 2) / petals);
        final s = dist * math.sin(d);
        if (petalR * petalR >= s * s) r = math.max(r, dist * math.cos(d) + math.sqrt(petalR * petalR - s * s));
      }
      return r;
    };

final List<Pt> _bloomPts = _polarPoints(200, 208, _flowerRadius(5, 78, 74, 112), 360);
final List<Pt> _gearPts = gearPoints(200, 200, 10, 132, 158);

const _v = VisorRect.new;
const _l = StatusLight.new;

/// All twenty chassis, in studio order.
final List<Chassis> chassisList = [
  _poly('octa', 'Octa', 'CH-01', [(95, 95), (305, 95), (350, 140), (350, 265), (305, 310), (95, 310), (50, 265), (50, 140)], 14,
      visor: _v(x: 95, y: 162, w: 210, h: 110, r: 50),
      light: _l(x: 150, y: 124, w: 100, h: 13),
      screws: [(104, 124), (296, 124), (104, 282), (296, 282)],
      optics: Optics.dual),
  Chassis(
      id: 'capsule',
      name: 'Capsule',
      code: 'CH-02',
      path: 'M135 110 H265 A95 95 0 0 1 265 300 H135 A95 95 0 0 1 135 110 Z',
      box: [40, 110, 360, 300],
      visor: _v(x: 105, y: 162, w: 190, h: 104, r: 50),
      light: _l(x: 150, y: 128, w: 100, h: 13),
      screws: [(70, 205), (330, 205)],
      optics: Optics.dual),
  _poly('tab', 'Tabbed', 'CH-03', [(55, 132), (112, 132), (112, 98), (288, 98), (288, 132), (345, 132), (345, 252), (288, 310), (112, 310), (55, 252)], 12,
      visor: _v(x: 95, y: 172, w: 210, h: 106, r: 50), light: _l(x: 150, y: 143, w: 100, h: 12), screws: [(134, 116), (266, 116)], optics: Optics.dual),
  _poly('hex', 'Hexa', 'CH-04', [(125, 80), (275, 80), (345, 200), (275, 320), (125, 320), (55, 200)], 18,
      visor: _v(x: 140, y: 146, w: 120, h: 120, r: 40),
      light: _l(x: 152, y: 114, w: 96, h: 12),
      screws: [(138, 100), (262, 100), (138, 300), (262, 300)],
      optics: Optics.mono),
  Chassis(
      id: 'drop',
      name: 'Keyhole',
      code: 'CH-05',
      path: _dropPath(150, 318, 200, 108, 44),
      box: [42, 92, 362, 308],
      visor: _v(x: 92, y: 145, w: 112, h: 110, r: 36),
      light: _l(x: 222, y: 192, w: 90, h: 16),
      screws: [(64, 200), (336, 200)],
      optics: Optics.mono),
  _poly('chamfer', 'Chamfer', 'CH-06', [(135, 92), (348, 92), (348, 245), (285, 308), (52, 308), (52, 175)], 14,
      visor: _v(x: 85, y: 188, w: 205, h: 98, r: 46),
      light: _l(x: 255, y: 133, w: 70, h: 13, angle: -40),
      screws: [(160, 113), (326, 113), (326, 222)],
      optics: Optics.dual),
  Chassis(
      id: 'bloom',
      name: 'Bloom',
      code: 'CH-07',
      path: _polyPath(_bloomPts),
      box: _bbox(_bloomPts),
      visor: _v(x: 132, y: 152, w: 116, h: 110, r: 38),
      light: _l(x: 262, y: 156, w: 14, h: 100),
      screws: [
        for (var i = 0; i < 5; i++) (200 + 118 * math.cos(-math.pi / 2 + (i * math.pi * 2) / 5), 208 + 118 * math.sin(-math.pi / 2 + (i * math.pi * 2) / 5)),
      ],
      optics: Optics.mono),
  _poly('plate', 'Plate', 'CH-08',
      [(50, 135), (108, 135), (108, 100), (292, 100), (292, 135), (350, 135), (350, 275), (292, 275), (292, 308), (108, 308), (108, 275), (50, 275)], 13,
      visor: _v(x: 92, y: 168, w: 216, h: 100, r: 48),
      light: _l(x: 155, y: 140, w: 90, h: 12),
      screws: [(72, 156), (328, 156), (72, 254), (328, 254)],
      optics: Optics.dual),
  _poly('gear', 'Sprocket', 'CH-09', _gearPts, 5,
      visor: _v(x: 115, y: 152, w: 170, h: 98, r: 46),
      light: _l(x: 160, y: 120, w: 80, h: 12),
      screws: [(121, 121), (279, 121), (121, 279), (279, 279)],
      optics: Optics.dual),
  Chassis(
      id: 'orb',
      name: 'Orb',
      code: 'CH-10',
      path: 'M50 200 A150 150 0 1 0 350 200 A150 150 0 1 0 50 200 Z',
      box: [50, 50, 350, 350],
      visor: _v(x: 100, y: 160, w: 200, h: 100, r: 48),
      light: _l(x: 150, y: 122, w: 100, h: 13),
      screws: [(200, 76), (76, 200), (324, 200), (200, 324)],
      optics: Optics.dual),
  _poly('keystone', 'Keystone', 'CH-11', [(131, 95), (269, 95), (350, 237), (314, 305), (86, 305), (50, 237)], 16,
      visor: _v(x: 98, y: 179, w: 204, h: 100, r: 48),
      light: _l(x: 154, y: 154, w: 92, h: 13),
      screws: [(200, 120), (73, 240), (327, 240)],
      optics: Optics.dual),
  Chassis(
      id: 'dome',
      name: 'Dome',
      code: 'CH-12',
      path: 'M50 230 A150 150 0 0 1 350 230 L350 291 Q350 305 336 305 L64 305 Q50 305 50 291 Z',
      box: [50, 80, 350, 305],
      visor: _v(x: 105, y: 172, w: 190, h: 95, r: 46),
      light: _l(x: 158, y: 136, w: 84, h: 13),
      screws: [(72, 284), (328, 284)],
      optics: Optics.dual),
  _poly('clamp', 'Clamp', 'CH-13', _clampPts, 7,
      visor: _v(x: 110, y: 160, w: 180, h: 94, r: 45), light: _l(x: 160, y: 130, w: 80, h: 12), screws: [(52, 200), (348, 200)], optics: Optics.dual),
  _poly(
      'bracket',
      'Bracket',
      'CH-14',
      [
        (130, 85),
        (270, 85),
        (270, 105),
        (300, 105),
        (300, 128),
        (345, 128),
        (345, 290),
        (258, 290),
        (258, 312),
        (142, 312),
        (142, 290),
        (55, 290),
        (55, 128),
        (100, 128),
        (100, 105),
        (130, 105)
      ],
      9,
      visor: _v(x: 100, y: 162, w: 200, h: 98, r: 46),
      light: _l(x: 160, y: 118, w: 80, h: 12),
      screws: [(76, 270), (324, 270)],
      optics: Optics.dual),
  _poly('crest', 'Crest', 'CH-15', [(60, 95), (340, 95), (340, 215), (200, 335), (60, 215)], 20,
      visor: _v(x: 110, y: 148, w: 180, h: 90, r: 44),
      light: _l(x: 160, y: 116, w: 80, h: 12),
      screws: [(86, 120), (314, 120), (200, 298)],
      optics: Optics.dual),
  _poly('cross', 'Cross', 'CH-16',
      [(130, 65), (270, 65), (270, 140), (360, 140), (360, 280), (270, 280), (270, 340), (130, 340), (130, 280), (40, 280), (40, 140), (130, 140)], 18,
      visor: _v(x: 92, y: 172, w: 216, h: 92, r: 44),
      light: _l(x: 160, y: 130, w: 80, h: 12),
      screws: [(165, 92), (235, 92), (62, 210), (338, 210), (200, 312)],
      optics: Optics.dual),
  Chassis(
      id: 'ticket',
      name: 'Ticket',
      code: 'CH-17',
      path: 'M67 110 H333 Q355 110 355 132 V179 A26 26 0 0 0 355 231 V278 Q355 300 333 300 H67 Q45 300 45 278 V231 A26 26 0 0 0 45 179 V132 Q45 110 67 110 Z',
      box: [45, 110, 355, 300],
      visor: _v(x: 100, y: 164, w: 200, h: 98, r: 47),
      light: _l(x: 155, y: 132, w: 90, h: 12),
      screws: [(72, 136), (328, 136), (72, 274), (328, 274)],
      optics: Optics.dual),
  _poly(
      'rampart',
      'Rampart',
      'CH-18',
      [
        (92, 92),
        (308, 92),
        (336, 120),
        (336, 312),
        (262, 312),
        (262, 288),
        (236, 288),
        (236, 312),
        (164, 312),
        (164, 288),
        (138, 288),
        (138, 312),
        (64, 312),
        (64, 120)
      ],
      10,
      visor: _v(x: 96, y: 160, w: 208, h: 100, r: 48),
      light: _l(x: 150, y: 128, w: 100, h: 12),
      screws: [(104, 112), (296, 112)],
      optics: Optics.dual),
  _poly('lynx', 'Lynx', 'CH-19', [(50, 80), (104, 80), (146, 124), (254, 124), (296, 80), (350, 80), (350, 292), (312, 330), (88, 330), (50, 292)], 18,
      visor: _v(x: 92, y: 158, w: 216, h: 100, r: 48), light: _l(x: 150, y: 288, w: 100, h: 13), screws: [(78, 106), (322, 106)], optics: Optics.dual),
  _poly('fold', 'Fold', 'CH-20', [(120, 64), (318, 64), (336, 82), (336, 236), (256, 336), (82, 336), (64, 318), (64, 120)], 16,
      visor: _v(x: 96, y: 172, w: 128, h: 128, r: 44), light: _l(x: 284, y: 104, w: 14, h: 100), screws: [(120, 104)], optics: Optics.mono),
];

/// The chassis with this id, or Octa.
Chassis chassisById(String id) => chassisList.firstWhere((c) => c.id == id, orElse: () => chassisList.first);
