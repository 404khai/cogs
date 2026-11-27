import 'dart:convert';
import 'dart:math' as math;

import 'chassis.dart';
import 'expressions.dart';

/// What the visor shows.
enum ScreenMode {
  eyes('Eyes', 'The expression, with gaze and blinks.'),
  wave('Voice', 'A waveform for agents that are speaking.'),
  dots('Typing', 'Three bouncing dots while it composes.'),
  glyph('Glyph', 'A pixel robot icon on the dot matrix.'),
  think('Thinking', 'A light chases round a ring of LEDs while satellites orbit a breathing core.'),
  search('Search', 'A radar sweep; blips flare as the beam finds them.'),
  code('Coding', 'Code scrolls up a terminal above a blinking prompt.'),
  work('Working', 'A train of solid LED gears meshes and turns while the agent grinds through a job.');

  const ScreenMode(this.label, this.note);
  final String label;
  final String note;
}

/// One eye or two. `auto` uses the chassis' own.
enum OpticsMode { auto, mono, dual }

/// A cog, as stored in cog JSON (`cogs/unit@1`).
class CogConfig {
  const CogConfig({
    this.name = 'Rivet',
    this.chassis = 'octa',
    this.color = '#7cc9ea',
    this.glow = '#46d6ff',
    this.expression = 'idle',
    this.screen = ScreenMode.eyes,
    this.optics = OpticsMode.auto,
    this.pupils = true,
    this.charge = 0.78,
    this.curiosity = 0.7,
    this.blink = 0.5,
  });

  final String name;

  /// A chassis id, e.g. `octa` or `gear`.
  final String chassis;

  /// Paint, `#rrggbb`.
  final String color;

  /// LED colour, `#rrggbb`.
  final String glow;

  /// An expression id, e.g. `idle` or `angry`.
  final String expression;
  final ScreenMode screen;
  final OpticsMode optics;
  final bool pupils;

  /// Core charge (glow strength), 0–1.
  final double charge;

  /// How far the gaze wanders and follows the pointer, 0–1.
  final double curiosity;

  /// Blink rate, 0–1.
  final double blink;

  CogConfig copyWith({
    String? name,
    String? chassis,
    String? color,
    String? glow,
    String? expression,
    ScreenMode? screen,
    OpticsMode? optics,
    bool? pupils,
    double? charge,
    double? curiosity,
    double? blink,
  }) =>
      CogConfig(
        name: name ?? this.name,
        chassis: chassis ?? this.chassis,
        color: color ?? this.color,
        glow: glow ?? this.glow,
        expression: expression ?? this.expression,
        screen: screen ?? this.screen,
        optics: optics ?? this.optics,
        pupils: pupils ?? this.pupils,
        charge: charge ?? this.charge,
        curiosity: curiosity ?? this.curiosity,
        blink: blink ?? this.blink,
      );

  /// The fields in cog JSON order, without `$schema`.
  Map<String, Object> toMap() => {
        'name': name,
        'chassis': chassis,
        'color': color,
        'glow': glow,
        'expression': expression,
        'screen': screen.name,
        'optics': optics.name,
        'pupils': pupils,
        'charge': charge,
        'curiosity': curiosity,
        'blink': blink,
      };

  /// Portable JSON form of a cog, as the studio exports it.
  String toJson() => const JsonEncoder.withIndent('  ').convert({r'$schema': 'cogs/unit@1', ...toMap()});

  /// Parses cog JSON; throws a [FormatException] if it can't be read. Use [parseCog] to see warnings.
  static CogConfig fromJson(String text) => switch (parseCog(text)) {
        CogParsed(:final config) => config,
        CogParseError(:final error) => throw FormatException(error),
      };

  @override
  bool operator ==(Object other) => other is CogConfig && jsonEncode(toMap()) == jsonEncode(other.toMap());

  @override
  int get hashCode => jsonEncode(toMap()).hashCode;

  @override
  String toString() => 'CogConfig(${jsonEncode(toMap())})';
}

/// A named swatch from the studio palette.
class CogPaint {
  const CogPaint(this.name, this.hex);
  final String name;
  final String hex;
}

const paints = [
  CogPaint('Sky', '#7cc9ea'),
  CogPaint('Coral', '#e8603f'),
  CogPaint('Mint', '#72c97c'),
  CogPaint('Lilac', '#9d8df0'),
  CogPaint('Alloy', '#d3d3cf'),
  CogPaint('Orchid', '#e46fdc'),
  CogPaint('Cobalt', '#3657d8'),
  CogPaint('Lemon', '#efe06a'),
  CogPaint('Volt', '#ff6a2b'),
  CogPaint('Carbon', '#3b3f46'),
];

const glows = [
  CogPaint('Cyan', '#46d6ff'),
  CogPaint('Ice', '#bfefff'),
  CogPaint('Amber', '#ffb23f'),
  CogPaint('Lime', '#9dff5c'),
  CogPaint('Rose', '#ff6fa8'),
];

/// Rivet, the default unit.
const defaultCog = CogConfig();

/// The house unit: our logo.
const logoCog = CogConfig(name: 'Flange', chassis: 'gear', color: '#e8603f', glow: '#ffb23f', expression: 'angry', pupils: false);

/// The studio's roster, with each unit's role.
const roster = <(CogConfig, String)>[
  (CogConfig(name: 'Rivet', chassis: 'octa', color: '#7cc9ea'), 'Code review'),
  (CogConfig(name: 'Piston', chassis: 'capsule', color: '#e8603f', screen: ScreenMode.think), 'Incident triage'),
  (CogConfig(name: 'Sprocket', chassis: 'tab', color: '#72c97c', expression: 'happy'), 'Onboarding'),
  (CogConfig(name: 'Gimbal', chassis: 'hex', color: '#9d8df0', screen: ScreenMode.search), 'Research'),
  (CogConfig(name: 'Gasket', chassis: 'drop', color: '#d3d3cf', expression: 'suspicious', glow: '#bfefff'), 'Security audit'),
  (CogConfig(name: 'Spindle', chassis: 'chamfer', color: '#e46fdc', screen: ScreenMode.dots), 'Docs writer'),
  (CogConfig(name: 'Pinion', chassis: 'bloom', color: '#3657d8', screen: ScreenMode.wave), 'Voice agent'),
  (CogConfig(name: 'Ratchet', chassis: 'gear', color: '#ff6a2b', screen: ScreenMode.code, glow: '#ffb23f'), 'CI runner'),
];

const _names = [
  'Rivet',
  'Sprocket',
  'Ratchet',
  'Gasket',
  'Piston',
  'Spindle',
  'Pinion',
  'Gimbal',
  'Flange',
  'Bushing',
  'Grommet',
  'Clevis',
  'Tappet',
  'Detent',
  'Pawl',
  'Shim',
  'Dowel',
  'Collet',
  'Cotter',
  'Spline',
  'Caster',
  'Axle',
  'Clutch',
  'Knurl',
  'Bolt',
  'Washer',
  'Hinge',
  'Socket',
  'Lever',
  'Cam',
  'Torque',
  'Valve',
  'Coil',
  'Servo',
  'Anvil',
  'Crank',
  'Toggle',
  'Bracket',
  'Swivel',
  'Sprue',
];

T _pick<T>(List<T> a, math.Random rng) => a[rng.nextInt(a.length)];

String randomName([String? not, math.Random? rng]) => _pick(_names.where((n) => n != not).toList(), rng ?? math.Random());

/// A fresh unit, keeping [prev]'s power settings. Same odds as the studio's `R` key.
CogConfig randomConfig([CogConfig prev = defaultCog, math.Random? rng]) {
  final g = rng ?? math.Random();
  final r = g.nextDouble();
  return prev.copyWith(
    name: randomName(prev.name, g),
    chassis: _pick(chassisList, g).id,
    color: _pick(paints, g).hex,
    glow: g.nextDouble() < 0.6 ? glows[0].hex : _pick(glows, g).hex,
    expression: _pick(expressions, g).id,
    screen: r < 0.7 ? ScreenMode.eyes : ScreenMode.values[1 + g.nextInt(ScreenMode.values.length - 1)],
    optics: OpticsMode.auto,
    pupils: g.nextDouble() < 0.75,
  );
}

/// The serial number the studio stamps on a unit, e.g. `3A-F09C-11`.
String serial(CogConfig c) {
  final s = jsonEncode([c.chassis, c.color, c.glow, c.expression, c.screen.name, c.optics.name, c.name]);
  var h = 5381;
  for (final u in s.codeUnits) {
    h = ((h << 5) + h + u) & 0xffffffff;
  }
  final hex = h.toRadixString(16).toUpperCase().padLeft(8, '0');
  return '${hex.substring(0, 2)}-${hex.substring(2, 6)}-${hex.substring(6, 8)}';
}

/// The studio's share-link payload (the part after `#`).
String encodeConfig(CogConfig c) => base64Encode(utf8.encode(jsonEncode(c.toMap())));

/// Reads a share-link payload; null if it isn't one.
CogConfig? decodeConfig(String s) {
  try {
    final res = parseCog(utf8.decode(base64Decode(s)));
    return res is CogParsed ? res.config : null;
  } catch (_) {
    return null;
  }
}

/// The result of [parseCog].
sealed class CogParseResult {
  const CogParseResult();
}

/// A usable config, with a warning for each field that fell back to its default.
class CogParsed extends CogParseResult {
  const CogParsed(this.config, this.warnings);
  final CogConfig config;
  final List<String> warnings;
}

/// The text isn't cog JSON at all.
class CogParseError extends CogParseResult {
  const CogParseError(this.error);
  final String error;
}

final _hex = RegExp(r'^#[0-9a-f]{6}$', caseSensitive: false);

/// JavaScript's `String(v)`, for warning messages.
String _js(Object? v) => switch (v) {
      null => 'null',
      double d when d == d.roundToDouble() && d.isFinite => d.toInt().toString(),
      List l => l.map(_js).join(','),
      Map _ => '[object Object]',
      _ => v.toString(),
    };

/// Parse pasted / uploaded JSON into a valid config. Unknown or bad fields fall back to defaults and are reported.
CogParseResult parseCog(String text) {
  Object? raw;
  try {
    raw = jsonDecode(text);
  } on FormatException catch (e) {
    return CogParseError('Invalid JSON: ${e.message}');
  }
  if (raw is! Map<String, dynamic>) return const CogParseError('Expected a JSON object describing a cog.');
  final r = raw;
  if (!r.containsKey('chassis') && !r.containsKey('expression') && !r.containsKey('color')) {
    return const CogParseError('No cog fields found (chassis, color, expression…).');
  }

  final warnings = <String>[];
  T oneOf<T>(String key, Map<String, T> ok, T fallback, String fallbackId) {
    if (!r.containsKey(key)) return fallback;
    final v = r[key];
    if (v is String && ok.containsKey(v)) return ok[v] as T;
    warnings.add('$key: "${_js(v)}" unknown, using "$fallbackId"');
    return fallback;
  }

  String hex(String key, String fallback) {
    if (!r.containsKey(key)) return fallback;
    final v = r[key];
    if (v is String && _hex.hasMatch(v)) return v.toLowerCase();
    warnings.add('$key: expected #rrggbb');
    return fallback;
  }

  double clamp01(Object? n, double fallback) => n is num && n.isFinite ? n.toDouble().clamp(0, 1).toDouble() : fallback;

  const d = defaultCog;
  final name = r['name'];
  final trimmed = name is String ? name.trim() : '';
  return CogParsed(
    CogConfig(
      name: trimmed.isNotEmpty ? (trimmed.length > 16 ? trimmed.substring(0, 16) : trimmed) : d.name,
      chassis: oneOf('chassis', {for (final c in chassisList) c.id: c.id}, d.chassis, d.chassis),
      color: hex('color', d.color),
      glow: hex('glow', d.glow),
      expression: oneOf('expression', {for (final x in expressions) x.id: x.id}, d.expression, d.expression),
      screen: oneOf('screen', {for (final s in ScreenMode.values) s.name: s}, d.screen, d.screen.name),
      optics: oneOf('optics', {for (final o in OpticsMode.values) o.name: o}, d.optics, d.optics.name),
      pupils: r['pupils'] is bool ? r['pupils'] as bool : d.pupils,
      charge: clamp01(r['charge'], d.charge),
      curiosity: clamp01(r['curiosity'], d.curiosity),
      blink: clamp01(r['blink'], d.blink),
    ),
    warnings,
  );
}
