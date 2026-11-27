import 'dart:ui' show lerpDouble;

/// Eye parameters. All lengths are fractions of the eye slot.
///
/// top/bottom: lid coverage. tilt: degrees, positive drops the inner corner (angry).
/// cheek: rising lower crescent (happy). sx/sy: scale. rx: corner roundness (0.5 = circle).
/// ps: pupil scale (0 hides). px/py: pupil bias, -1..1.
class EyeP {
  const EyeP({
    this.top = 0,
    this.tilt = 0,
    this.bottom = 0,
    this.cheek = 0,
    this.sx = 1,
    this.sy = 1,
    this.rx = 0.36,
    this.ps = 1,
    this.px = 0,
    this.py = 0,
  });
  final double top, tilt, bottom, cheek, sx, sy, rx, ps, px, py;

  List<double> get values => [top, tilt, bottom, cheek, sx, sy, rx, ps, px, py];

  factory EyeP.fromValues(List<double> v) => EyeP(top: v[0], tilt: v[1], bottom: v[2], cheek: v[3], sx: v[4], sy: v[5], rx: v[6], ps: v[7], px: v[8], py: v[9]);

  /// Move a fraction [k] of the way towards [to].
  EyeP toward(EyeP to, double k) {
    final a = values;
    final b = to.values;
    return EyeP.fromValues([for (var i = 0; i < a.length; i++) lerpDouble(a[i], b[i], k)!]);
  }

  /// Largest absolute difference in any parameter.
  double distance(EyeP o) {
    final a = values;
    final b = o.values;
    var d = 0.0;
    for (var i = 0; i < a.length; i++) {
      final x = (a[i] - b[i]).abs();
      if (x > d) d = x;
    }
    return d;
  }
}

class Expression {
  const Expression({required this.id, required this.name, required this.code, required this.note, required this.L, required this.R});
  final String id;
  final String name;
  final String code;
  final String note;
  // ignore: non_constant_identifier_names
  final EyeP L, R;
}

Expression _both(String id, String name, String note, EyeP p, int i) =>
    Expression(id: id, name: name, note: note, code: 'EX-${i.toString().padLeft(2, '0')}', L: p, R: p);

/// All twelve expressions, in studio order.
final List<Expression> expressions = [
  _both('idle', 'Idle', 'Nominal. Awaiting instruction.', const EyeP(), 1),
  _both('happy', 'Happy', 'Task complete. Morale high.', const EyeP(cheek: 0.62, ps: 0, sy: 1.04), 2),
  _both('sleepy', 'Sleepy', 'Low-power mode engaged.', const EyeP(top: 0.56, bottom: 0.04, py: 0.45, ps: 0.85), 3),
  _both('angry', 'Angry', 'Build failed. Again.', const EyeP(top: 0.36, tilt: 24, py: 0.15, ps: 0.9), 4),
  _both('sad', 'Sad', 'Merge conflict detected.', const EyeP(top: 0.3, tilt: -20, py: 0.4, ps: 0.9), 5),
  _both('surprised', 'Surprised', 'Unexpected token.', const EyeP(sx: 1.06, sy: 1.12, rx: 0.5, ps: 0.55), 6),
  const Expression(
    id: 'suspicious',
    name: 'Suspicious',
    code: 'EX-07',
    note: 'Reviewing your PR.',
    L: EyeP(top: 0.5, tilt: 4, px: 0.7, py: 0.1),
    R: EyeP(top: 0.18, px: 0.7, py: 0.1),
  ),
  const Expression(
    id: 'wink',
    name: 'Wink',
    code: 'EX-08',
    note: 'Shipped to prod on a Friday.',
    L: EyeP(cheek: 0.58, ps: 0),
    R: EyeP(top: 0.45, bottom: 0.43, ps: 0),
  ),
  _both('focused', 'Focused', 'Compiling. Do not disturb.', const EyeP(top: 0.28, bottom: 0.26, tilt: 8, ps: 0.8), 9),
  const Expression(
    id: 'skeptic',
    name: 'Skeptic',
    code: 'EX-10',
    note: 'Citation needed.',
    L: EyeP(sy: 1.08, rx: 0.42, px: -0.3),
    R: EyeP(top: 0.44, tilt: -12, px: -0.3),
  ),
  _both('bored', 'Bored', 'Polling. Still polling.', const EyeP(top: 0.48, tilt: -5, px: -0.75, py: 0.25, ps: 0.85), 11),
  _both('lookup', 'Pondering', 'Thinking about types.', const EyeP(rx: 0.5, px: 0.45, py: -0.8, ps: 0.75), 12),
];

/// The expression with this id, or Idle.
Expression expressionById(String id) => expressions.firstWhere((x) => x.id == id, orElse: () => expressions.first);
