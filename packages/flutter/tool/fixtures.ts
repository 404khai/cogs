/**
 * Snapshots the web app's geometry and config helpers into test/fixtures/web.json, so the Dart
 * tests can check the port against the source. Run from packages/flutter:
 *
 *   bun tool/fixtures.ts
 */
import { writeFileSync } from 'node:fs';
import { CHASSIS, gearPoints, roundedPoly } from '../../../app/src/lib/chassis';
import { shade } from '../../../app/src/lib/color';
import { DEFAULT, LOGO, ROSTER, encodeConfig, parseCog, serial, toJSON } from '../../../app/src/lib/config';
import { EXPRESSIONS } from '../../../app/src/lib/expressions';
import { meshChain } from '../../../app/src/lib/gears';

const parse = [
  toJSON(LOGO),
  '{"chassis":"blob","color":"red","charge":7,"name":"   Spanner the Magnificent   "}',
  '{"expression":"wink","pupils":"yes","blink":-1,"glow":"#ABCDEF"}',
  '[1,2]',
  '{"foo":1}',
  '{oops',
].map((text) => ({ text, result: parseCog(text) }));

const fixtures = {
  chassis: CHASSIS,
  expressions: EXPRESSIONS,
  shade: ['#7cc9ea', '#e8603f', '#d3d3cf', '#3b3f46', '#46d6ff'].flatMap((hex) =>
    [[0.1, 0.04], [-0.1, 0.02], [-0.45, 0], [0.38, 0]].map(([dl, ds]) => ({ hex, dl, ds, out: shade(hex, dl, ds) })),
  ),
  serial: [DEFAULT, LOGO, ...ROSTER].map((c) => ({ config: c, serial: serial(c) })),
  encode: [DEFAULT, LOGO].map((c) => ({ config: c, encoded: encodeConfig(c) })),
  parse,
  gear: roundedPoly(gearPoints(200, 200, 12, 40, 52, 0.3), 2.5),
  mesh: meshChain(1, { z: 12, cx: 0, cy: 0 }, [{ z: 8, deg: -32 }, { z: 10, deg: 48 }]),
};

writeFileSync(new URL('../test/fixtures/web.json', import.meta.url), JSON.stringify(fixtures, null, 1) + '\n');
