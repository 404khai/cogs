import 'dart:convert';

import 'package:cogs/cogs.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('toJson writes cogs/unit@1 and round-trips', () {
    final json = logoCog.toJson();
    final m = jsonDecode(json) as Map<String, dynamic>;
    expect(m[r'$schema'], 'cogs/unit@1');
    expect(m.keys.skip(1), ['name', 'chassis', 'color', 'glow', 'expression', 'screen', 'optics', 'pupils', 'charge', 'curiosity', 'blink']);
    expect(CogConfig.fromJson(json), logoCog);
  });

  test('every field is optional, but some cog field must be there', () {
    expect((parseCog('{"chassis":"orb"}') as CogParsed).config, defaultCog.copyWith(chassis: 'orb'));
    expect(parseCog('{"name":"Bolt"}'), isA<CogParseError>());
    expect(() => CogConfig.fromJson('nope'), throwsFormatException);
  });

  test('bad values fall back with a warning each', () {
    final r = parseCog('{"chassis":"orb","screen":"tv","optics":3,"glow":"#FFF","charge":"high","curiosity":2}') as CogParsed;
    expect(r.warnings, ['glow: expected #rrggbb', 'screen: "tv" unknown, using "eyes"', 'optics: "3" unknown, using "auto"']);
    expect(r.config.screen, ScreenMode.eyes);
    expect(r.config.charge, defaultCog.charge);
    expect(r.config.curiosity, 1);
  });

  test('randomConfig picks real parts', () {
    for (var i = 0; i < 50; i++) {
      final c = randomConfig();
      expect(chassisList.any((x) => x.id == c.chassis), isTrue);
      expect(expressions.any((x) => x.id == c.expression), isTrue);
      expect(CogConfig.fromJson(c.toJson()), c);
    }
  });
}
