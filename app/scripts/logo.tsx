// Renders the house unit (Flange) to static SVG for the README and favicon.
// Server render = no effects, so eyes sit at rest: centred gaze, no blink.
import { renderToStaticMarkup } from 'react-dom/server';
import { Cog } from '../src/components/Cog';
import { LOGO } from '../src/lib/config';

const svg = renderToStaticMarkup(<Cog config={LOGO} track={false} />)
  .replace('<svg ', '<svg width="400" height="400" ');
await Bun.write(new URL('../public/logo.svg', import.meta.url), svg);
console.log(`wrote public/logo.svg (${svg.length} bytes)`);
