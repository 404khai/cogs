import 'dart:convert';
import 'dart:io';

import 'package:cogs/cogs.dart';
import 'package:flutter_test/flutter_test.dart';

/// The web studio's output, from `bun tool/fixtures.ts`.
final Map<String, dynamic> web = jsonDecode(File('test/fixtures/web.json').readAsStringSync());

CogConfig _cfg(Map<String, dynamic> m) => (parseCog(jsonEncode(m)) as CogParsed).config;

void main() {
  test('every chassis matches the web, path for path', () {
    final want = (web['chassis'] as List).cast<Map<String, dynamic>>();
    expect(chassisList.map((c) => c.id), want.map((c) => c['id']));
    for (var i = 0; i < want.length; i++) {
      final c = chassisList[i], w = want[i];
      expect(c.name, w['name']);
      expect(c.code, w['code']);
      expect(c.path, w['path'], reason: c.id);
      expect(c.box, w['box'], reason: c.id);
      expect(c.optics.name, w['optics']);
      final v = w['visor'], l = w['light'];
      expect([c.visor.x, c.visor.y, c.visor.w, c.visor.h, c.visor.r], [v['x'], v['y'], v['w'], v['h'], v['r']]);
      expect([c.light.x, c.light.y, c.light.w, c.light.h, c.light.angle], [l['x'], l['y'], l['w'], l['h'], l['angle']]);
      final screws = (w['screws'] as List).cast<List>();
      expect(c.screws.length, screws.length);
      for (var j = 0; j < screws.length; j++) {
        expect(c.screws[j].$1, closeTo(screws[j][0], 1e-9));
        expect(c.screws[j].$2, closeTo(screws[j][1], 1e-9));
      }
    }
  });

  test('every chassis path parses and sits inside its box', () {
    // Boxes bound the unrounded corner points, so rounded outlines sit up to a corner radius inside.
    for (final c in chassisList) {
      final b = svgBounds(c.path);
      final box = [b.left, b.top, -b.right, -b.bottom];
      final want = [c.box[0], c.box[1], -c.box[2], -c.box[3]];
      for (var i = 0; i < 4; i++) {
        expect(box[i], inInclusiveRange(want[i] - 1, want[i] + 10), reason: '${c.id} side $i');
      }
    }
  });

  test('expressions match the web', () {
    final want = (web['expressions'] as List).cast<Map<String, dynamic>>();
    expect(expressions.map((e) => e.id), want.map((e) => e['id']));
    const keys = ['top', 'tilt', 'bottom', 'cheek', 'sx', 'sy', 'rx', 'ps', 'px', 'py'];
    for (var i = 0; i < want.length; i++) {
      final e = expressions[i], w = want[i];
      expect([e.name, e.code, e.note], [w['name'], w['code'], w['note']]);
      expect(e.L.values, keys.map((k) => w['L'][k]), reason: '${e.id} L');
      expect(e.R.values, keys.map((k) => w['R'][k]), reason: '${e.id} R');
    }
  });

  test('shade matches the web', () {
    for (final s in (web['shade'] as List).cast<Map<String, dynamic>>()) {
      expect(shade(s['hex'], (s['dl'] as num).toDouble(), (s['ds'] as num).toDouble()), s['out'], reason: '$s');
    }
  });

  test('gear outlines and mesh trains match the web', () {
    expect(roundedPoly(gearPoints(200, 200, 12, 40, 52, 0.3), 2.5), web['gear']);
    final train = meshChain(1, (z: 12, cx: 0, cy: 0), [(z: 8, deg: -32), (z: 10, deg: 48)]);
    final want = (web['mesh'] as List).cast<Map<String, dynamic>>();
    for (var i = 0; i < want.length; i++) {
      expect(train[i].z, want[i]['z']);
      expect(train[i].cx, closeTo(want[i]['cx'], 1e-9));
      expect(train[i].cy, closeTo(want[i]['cy'], 1e-9));
      expect(train[i].phase, closeTo(want[i]['phase'], 1e-9));
      expect(train[i].dir, want[i]['dir']);
    }
  });

  test('serials and share links match the web', () {
    for (final s in (web['serial'] as List).cast<Map<String, dynamic>>()) {
      expect(serial(_cfg(s['config'])), s['serial']);
    }
    for (final e in (web['encode'] as List).cast<Map<String, dynamic>>()) {
      final c = _cfg(e['config']);
      expect(decodeConfig(e['encoded']), c);
      expect(decodeConfig(encodeConfig(c)), c);
    }
  });

  test('parseCog agrees with the web', () {
    for (final p in (web['parse'] as List).cast<Map<String, dynamic>>()) {
      final want = p['result'] as Map<String, dynamic>;
      final got = parseCog(p['text']);
      if (want.containsKey('error')) {
        final err = (got as CogParseError).error;
        final w = want['error'] as String;
        // Parser messages differ between engines; the prefix is ours.
        w.startsWith('Invalid JSON:') ? expect(err, startsWith('Invalid JSON:')) : expect(err, w);
      } else {
        final ok = got as CogParsed;
        expect(ok.warnings, want['warnings'], reason: p['text']);
        expect(ok.config, _cfg(want['config']));
      }
    }
  });
}
