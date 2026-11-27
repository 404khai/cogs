import 'package:cogs/cogs.dart';
import 'package:cogs_example/main.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('the studio builds a unit and changes its mood and display', (tester) async {
    await tester.pumpWidget(const StudioApp());
    expect(find.bySemanticsLabel('Flange, a sprocket cog looking angry'), findsOneWidget);
    await tester.tap(find.text('Happy'));
    await tester.pump();
    expect(find.bySemanticsLabel('Flange, a sprocket cog looking happy'), findsOneWidget);
    await tester.scrollUntilVisible(find.text('Glyph'), 200);
    await tester.tap(find.text('Glyph'));
    await tester.pump(const Duration(milliseconds: 300));
    // The serial in the app bar tracks the unit.
    expect(find.text('Flange  ·  ${serial(logoCog.copyWith(expression: 'happy', screen: ScreenMode.glyph))}'), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
  });
}
