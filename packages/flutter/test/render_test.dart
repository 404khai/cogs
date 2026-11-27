import 'dart:io';
import 'dart:ui' as ui;

import 'package:cogs/cogs.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart' hide paints;

/// Paints a still cog to an image. Set COGS_DUMP=dir to also write PNGs for a look.
Future<ui.Image> _render(CogConfig c, {double time = 0, double size = 200}) async {
  final rec = ui.PictureRecorder();
  final canvas = Canvas(rec);
  final e = expressionById(c.expression);
  CogPainter(config: c, frame: CogFrame(l: e.L, r: e.R, time: time)).paint(canvas, Size.square(size));
  return rec.endRecording().toImage(size.toInt(), size.toInt());
}

final _sheet = <ui.Image>[];

Future<void> _dump(String name, ui.Image img) async {
  final dir = Platform.environment['COGS_DUMP'];
  if (dir == null) return;
  _sheet.add(img);
  final bytes = await img.toByteData(format: ui.ImageByteFormat.png);
  File('$dir/$name.png')
    ..createSync(recursive: true)
    ..writeAsBytesSync(bytes!.buffer.asUint8List());
}

Future<int> _opaque(ui.Image img) async {
  final px = (await img.toByteData())!;
  var n = 0;
  for (var i = 3; i < px.lengthInBytes; i += 4) {
    if (px.getUint8(i) > 200) n++;
  }
  return n;
}

void main() {
  test('every chassis, expression and screen paints', () async {
    for (final ch in chassisList) {
      final img = await _render(defaultCog.copyWith(chassis: ch.id, color: paints[ch.code.hashCode % paints.length].hex));
      expect(await _opaque(img), greaterThan(200 * 200 * 0.25), reason: ch.id);
      await _dump('chassis-${ch.id}', img);
    }
    for (final ex in expressions) {
      await _dump('expression-${ex.id}', await _render(logoCog.copyWith(expression: ex.id, pupils: true)));
    }
    for (final s in ScreenMode.values) {
      await _dump('screen-${s.name}', await _render(defaultCog.copyWith(chassis: 'hex', screen: s), time: 0.7));
    }
    if (_sheet.isNotEmpty) {
      // Everything on one sheet, eight to a row.
      final rec = ui.PictureRecorder();
      final canvas = Canvas(rec)..drawColor(const Color(0xffeeece6), BlendMode.src);
      for (var i = 0; i < _sheet.length; i++) {
        canvas.drawImage(_sheet[i], Offset((i % 8) * 200.0, (i ~/ 8) * 200.0), Paint());
      }
      await _dump('sheet', await rec.endRecording().toImage(1600, ((_sheet.length + 7) ~/ 8) * 200));
    }
  });

  testWidgets('Cog animates and labels itself', (tester) async {
    await tester.pumpWidget(const Directionality(textDirection: TextDirection.ltr, child: Center(child: Cog(config: logoCog))));
    expect(find.bySemanticsLabel('Flange, a sprocket cog looking angry'), findsOneWidget);
    await tester.pump(const Duration(milliseconds: 500));
    await tester.pumpWidget(const Directionality(textDirection: TextDirection.ltr, child: Center(child: Cog(config: logoCog, expression: 'happy'))));
    await tester.pump(const Duration(seconds: 1));
    expect(find.bySemanticsLabel('Flange, a sprocket cog looking happy'), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('Cog.fromJson builds from cog JSON', (tester) async {
    await tester.pumpWidget(
        Directionality(textDirection: TextDirection.ltr, child: Center(child: Cog.fromJson('{"name":"Bolt","chassis":"orb","screen":"work"}', size: 96))));
    expect(find.bySemanticsLabel('Bolt, a orb cog looking idle'), findsOneWidget);
    expect(tester.getSize(find.byType(Cog)), const Size.square(96));
    await tester.pumpWidget(const SizedBox());
  });
}
