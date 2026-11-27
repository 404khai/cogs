import 'dart:ui';

final _token = RegExp(r'[MLHVQAZ]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?', caseSensitive: false);

final _cache = <String, Path>{};
final _bounds = <String, Rect>{};

/// Builds a [Path] from the absolute SVG path data the chassis use (M, L, H, V, Q, A, Z).
/// Results are cached, so treat the returned path as read-only.
Path svgPath(String d) => _cache[d] ??= _parse(d);

/// The tight bounds of [svgPath]'s outline, as SVG's objectBoundingBox measures them.
/// ([Path.getBounds] includes arc control points, which overshoot on large arcs.)
Rect svgBounds(String d) => _bounds[d] ??= pathBounds(svgPath(d));

/// Tight bounds of any path, from points sampled along its outline.
Rect pathBounds(Path p) {
  var l = double.infinity, t = double.infinity, r = -double.infinity, b = -double.infinity;
  for (final m in p.computeMetrics()) {
    final n = (m.length / 0.5).ceil();
    for (var i = 0; i <= n; i++) {
      final o = m.getTangentForOffset(m.length * i / n)?.position;
      if (o == null) continue;
      if (o.dx < l) l = o.dx;
      if (o.dx > r) r = o.dx;
      if (o.dy < t) t = o.dy;
      if (o.dy > b) b = o.dy;
    }
  }
  return Rect.fromLTRB(l, t, r, b);
}

Path _parse(String d) {
  final t = _token.allMatches(d).map((m) => m[0]!).toList();
  final p = Path();
  var i = 0;
  var cmd = '';
  var x = 0.0, y = 0.0;
  double n() => double.parse(t[i++]);
  bool flag() => n() != 0;
  while (i < t.length) {
    if (RegExp(r'^[A-Za-z]$').hasMatch(t[i])) cmd = t[i++].toUpperCase();
    switch (cmd) {
      case 'M':
        x = n();
        y = n();
        p.moveTo(x, y);
        cmd = 'L'; // Further pairs after M are line-tos.
      case 'L':
        x = n();
        y = n();
        p.lineTo(x, y);
      case 'H':
        x = n();
        p.lineTo(x, y);
      case 'V':
        y = n();
        p.lineTo(x, y);
      case 'Q':
        final cx = n(), cy = n();
        x = n();
        y = n();
        p.quadraticBezierTo(cx, cy, x, y);
      case 'A':
        final rx = n(), ry = n(), rot = n();
        final large = flag(), sweep = flag();
        x = n();
        y = n();
        // SVG's sweep-flag 1 turns towards positive angles, which is clockwise with y pointing down.
        p.arcToPoint(Offset(x, y), radius: Radius.elliptical(rx, ry), rotation: rot, largeArc: large, clockwise: sweep);
      case 'Z':
        p.close();
      default:
        throw FormatException('Unsupported path command "$cmd"', d);
    }
  }
  return p;
}
