import 'dart:math' as math;
import 'dart:ui' show Color;

double _clamp01(double n) => math.min(1, math.max(0, n));

/// `#rrggbb` (or `#rgb`) to `[hue°, saturation, lightness]`, saturation and lightness in 0..1.
List<double> hexToHsl(String hex) {
  var h = hex.replaceFirst('#', '');
  if (h.length == 3) h = h.split('').map((c) => c + c).join();
  final r = int.parse(h.substring(0, 2), radix: 16) / 255;
  final g = int.parse(h.substring(2, 4), radix: 16) / 255;
  final b = int.parse(h.substring(4, 6), radix: 16) / 255;
  final mx = math.max(r, math.max(g, b));
  final mn = math.min(r, math.min(g, b));
  final l = (mx + mn) / 2;
  if (mx == mn) return [0, 0, l];
  final d = mx - mn;
  final s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  double hue;
  if (mx == r) {
    hue = (g - b) / d + (g < b ? 6 : 0);
  } else if (mx == g) {
    hue = (b - r) / d + 2;
  } else {
    hue = (r - g) / d + 4;
  }
  return [hue * 60, s, l];
}

String hslToHex(double h, double s, double l) {
  double k(double n) => (n + h / 30) % 12;
  final a = s * math.min(l, 1 - l);
  double f(double n) => l - a * math.max(-1, math.min(k(n) - 3, math.min(9 - k(n), 1)));
  String to(double x) => (_clamp01(x) * 255).round().toRadixString(16).padLeft(2, '0');
  return '#${to(f(0))}${to(f(8))}${to(f(4))}';
}

/// Shift lightness (and optionally saturation) by an absolute amount in 0..1 space.
String shade(String hex, double dl, [double ds = 0]) {
  final hsl = hexToHsl(hex);
  return hslToHex(hsl[0], _clamp01(hsl[1] + ds), _clamp01(hsl[2] + dl));
}

double luminance(String hex) => hexToHsl(hex)[2];

/// `#rrggbb` to a [Color], with an optional opacity.
Color hexColor(String hex, [double opacity = 1]) {
  final v = int.parse(hex.replaceFirst('#', ''), radix: 16);
  return Color(((opacity * 255).round().clamp(0, 255) << 24) | v);
}
