// Contact sheet of the React Native renderer next to the studio's, as SVG (and PNG if rsvg-convert is installed).
// Rows: every chassis, then every screen and expression. Left of each pair is the studio, right is react-native-svg.
//   bun scripts/preview.tsx [out-dir]     (needs `bun install` in app/ too)
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { installShims } from '../test/shim';

installShims();
const { Cog, CHASSIS, EXPRESSIONS, SCREENS, ROSTER, resolveCog } = await import('../src/index');
const { Cog: WebCog } = await import('../../../app/src/components/Cog');
const React = await import('../../../app/node_modules/react');
const DOM = await import('../../../app/node_modules/react-dom/server');

const out = process.argv[2] ?? 'preview';
const S = 120;
const units = [
  ...CHASSIS.map((c, i) => ({ ...ROSTER[i % ROSTER.length], chassis: c.id, screen: 'eyes' as const })),
  ...SCREENS.map((s, i) => ({ ...ROSTER[i % ROSTER.length], screen: s.id })),
  ...EXPRESSIONS.map((e, i) => ({ ...ROSTER[(i + 3) % ROSTER.length], expression: e.id, screen: 'eyes' as const })),
];
const cols = 8;
const cells = units.map((u, i) => {
  const { config } = resolveCog(u);
  const web = DOM.renderToStaticMarkup(React.createElement(WebCog, { config, track: false }));
  const native = renderToStaticMarkup(createElement(Cog, { unit: config, size: S, animated: false }));
  const x = (i % cols) * S * 2.2;
  const y = Math.floor(i / cols) * S * 1.1;
  // Each render reuses the same useId, so give every cell's ids a prefix of its own.
  const at = (svg: string, dx: number) => svg.replaceAll('id="', `id="p${i}-${dx}`).replaceAll('url(#', `url(#p${i}-${dx}`).replace(/^<svg[^>]*>/, (open) => open.replace(/ (width|height)="[^"]*"/g, '').replace('<svg ', `<svg x="${x + dx}" y="${y}" width="${S}" height="${S}" `));
  return at(web, 0) + at(native, S);
});
const W = cols * S * 2.2;
const H = Math.ceil(units.length / cols) * S * 1.1;
const sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="100%" height="100%" fill="#eef0ea"/>${cells.join('')}</svg>`;
await Bun.write(`${out}/sheet.svg`, sheet);
const png = Bun.spawnSync(['rsvg-convert', '-o', `${out}/sheet.png`, `${out}/sheet.svg`]);
console.log(`wrote ${out}/sheet.svg${png.exitCode === 0 ? ` and ${out}/sheet.png` : ''} (${units.length} pairs)`);
