# cogs for Flutter

Cogs avatars, painted with `CustomPainter`. It's the same machined units as the [cogs studio](https://github.com/404khai/cogs): 20 chassis, 12 expressions and 8 display modes, built from cog JSON.

```sh
flutter pub add cogs
```

## Use

```dart
import 'package:cogs/cogs.dart';

// A live unit: eyes follow the pointer, glance around and blink.
const Cog(config: logoCog, size: 160)

// Straight from the studio's JSON.
Cog.fromJson(json, size: 96)

// Drive the mood and the display from your own state.
Cog(config: unit.copyWith(screen: ScreenMode.think), expression: 'happy')
```

`Cog` tweens between expressions when `expression` or `config` changes. `track: false` stops the eyes following the pointer. When the platform asks for reduced motion (`MediaQuery.disableAnimations`), the unit snaps between expressions and holds still.

For a still image, or to draw a unit into your own canvas, use the painter:

```dart
CustomPaint(size: const Size.square(64), painter: CogPainter(config: unit))
CogPainter(config: unit, expression: 'wink')                 // any expression at rest
paintCog(canvas, unit, CogFrame.still(expressionById('sad'))) // into a 400 × 400 canvas
```

## Cog JSON

```json
{
  "$schema": "cogs/unit@1",
  "name": "Flange",
  "chassis": "gear",
  "color": "#e8603f",
  "glow": "#ffb23f",
  "expression": "angry",
  "screen": "eyes",
  "optics": "auto",
  "pupils": false,
  "charge": 0.78,
  "curiosity": 0.7,
  "blink": 0.5
}
```

`parseCog` reads it the way the studio does. Every field is optional. Missing or invalid values fall back to the defaults, with one warning for each.

```dart
switch (parseCog(text)) {
  case CogParsed(:final config, :final warnings):
    setState(() => unit = config);
    warnings.forEach(print); // e.g. chassis: "blob" unknown, using "octa"
  case CogParseError(:final error):
    print(error);
}
```

`CogConfig.toJson()` writes the studio's export format. `CogConfig.fromJson` throws a `FormatException` on unreadable input. `encodeConfig` / `decodeConfig` read and write the studio's share-link payload (the part after `#`), and `serial` gives a unit's serial number.

| Field | Values |
| --- | --- |
| `chassis` | `octa` `capsule` `tab` `hex` `drop` `chamfer` `bloom` `plate` `gear` `orb` `keystone` `dome` `clamp` `bracket` `crest` `cross` `ticket` `rampart` `lynx` `fold` |
| `expression` | `idle` `happy` `sleepy` `angry` `sad` `surprised` `suspicious` `wink` `focused` `skeptic` `bored` `lookup` |
| `screen` | `eyes` `wave` `dots` `glyph` `think` `search` `code` `work` |
| `optics` | `auto` `mono` `dual` |
| `color`, `glow` | `#rrggbb` |
| `charge`, `curiosity`, `blink` | `0` – `1` |

The parts lists are `chassisList`, `expressions`, `ScreenMode.values`, `paints` and `glows`. `roster` has the studio's eight units, and `randomConfig()` rolls a new one.

## How it's built

The geometry is a straight port of the web app's `lib/chassis.ts`, `lib/expressions.ts`, `lib/gears.ts` and `lib/color.ts`. The chassis carry the same SVG path data, which `svgPath` turns into a `Path`. The painter follows the layers of `components/Cog.tsx` and `components/Eyes.tsx` in order:

- the body with its gradient, drop shadow and bevel
- the fasteners
- the visor recess with its notch for the status light
- the pulsing LED
- the screen with its dot-matrix eyes or display mode, under a bloom pass

SVG filters become mask-filter and image-filter blurs. The SMIL and CSS animations are evaluated from `CogFrame.time`.

`test/fixtures/web.json` is a snapshot of the web code's own output: every chassis path, the expressions, colour shading, gear trains, serials, share links and JSON parsing. The tests check the port against it. After changing the web geometry, regenerate the snapshot from this directory:

```sh
bun tool/fixtures.ts
flutter test
```

To look at every chassis, expression and display mode, run `COGS_DUMP=build/dump flutter test test/render_test.dart`. It writes PNGs and a contact sheet.

## Example

`example/` is a pocket studio with chassis, mood, display, paint and power controls, copy and paste for JSON, and the roster. See `example/README.md` for how to run it.
