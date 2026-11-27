import { describe, expect, test } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { installShims } from './shim';

installShims();
const { Cog, CHASSIS, EXPRESSIONS, SCREENS, resolveCog, LOGO, toJSON } = await import('../src/index');
const motion = await import('../src/motion');
// The studio's renderer resolves React from app/node_modules (run `bun install` in app/ first), so render it with that copy.
const { Cog: WebCog } = await import('../../../app/src/components/Cog');
const web = {
  React: await import('../../../app/node_modules/react'),
  DOM: await import('../../../app/node_modules/react-dom/server'),
};

const render = (props: Parameters<typeof Cog>[0]) => renderToStaticMarkup(createElement(Cog, props));

describe('Cog', () => {
  test('renders every chassis on every screen', () => {
    for (const ch of CHASSIS) {
      for (const sc of SCREENS) {
        const svg = render({ chassis: ch.id, screen: sc.id, size: 64 });
        expect(svg.startsWith('<svg')).toBe(true);
        expect(svg).toContain(`width="64"`);
        expect(svg).toContain(ch.path);
      }
    }
  });

  test('builds from cog JSON, with field props overriding it', () => {
    const svg = render({ unit: toJSON(LOGO) });
    expect(svg).toContain('aria-label="Flange, a sprocket cog looking angry"');
    expect(render({ unit: toJSON(LOGO), expression: 'happy' })).toContain('looking happy');
  });

  test('poses every expression like the web renderer', () => {
    // The eye masks hold the lid, tilt and cheek geometry: they should match the studio's, attribute for attribute.
    const masks = (svg: string) => [...svg.matchAll(/<mask\b.*?<\/mask>/g)].map((m) => m[0].replace(/id="[^"]*"/g, ''));
    for (const ex of EXPRESSIONS) {
      for (const optics of ['mono', 'dual'] as const) {
        const config = resolveCog({ expression: ex.id, optics }).config;
        const studio = web.DOM.renderToStaticMarkup(web.React.createElement(WebCog, { config, track: false }));
        const native = render({ unit: config, animated: false });
        expect(masks(native).length).toBe(optics === 'mono' ? 1 : 2);
        expect(masks(native)).toEqual(masks(studio));
      }
    }
  });
});

describe('resolveCog', () => {
  test('falls back with a warning per bad field', () => {
    const { config, warnings } = resolveCog('{"chassis":"blob","color":"red","expression":"happy"}');
    expect(config.chassis).toBe('octa');
    expect(config.expression).toBe('happy');
    expect(warnings).toEqual(['chassis: "blob" unknown, using "octa"', 'color: expected #rrggbb']);
  });

  test('reports bad JSON and keeps the defaults', () => {
    const { config, warnings } = resolveCog('{nope', { chassis: 'hex' });
    expect(config.chassis).toBe('hex');
    expect(warnings[0]).toStartWith('Invalid JSON');
  });

  test('ignores undefined fields', () => {
    expect(resolveCog({ chassis: 'orb' }, { chassis: undefined }).config.chassis).toBe('orb');
  });
});

describe('motion', () => {
  test('wave bars pulse between a quarter and full height', () => {
    expect(motion.waveScale(0, 0, 1)).toBeCloseTo(0.25);
    expect(motion.waveScale(1, 0, 1)).toBeCloseTo(1);
    expect(motion.waveScale(2, 0, 1)).toBeCloseTo(0.25);
    expect(motion.waveScale(1.5, 0, 1)).toBeCloseTo(0.625);
  });

  test('typing dots peak at 30% of the cycle', () => {
    expect(motion.dotHop(0.33, 0, 1.1, 9)).toEqual({ dy: -9, opacity: 1 });
    expect(motion.dotHop(0.9, 0, 1.1, 9)).toEqual({ dy: 0, opacity: 0.55 });
    expect(motion.dotHop(0.1, 0.16, 1.1, 9)).toEqual({ dy: 0, opacity: 0.55 });
  });

  test('thinking LEDs light at their begin and fade to 0.15 by 60%', () => {
    expect(motion.chase(0.5, 0.5, 1.2)).toBeCloseTo(1);
    expect(motion.chase(0.5 + 0.72, 0.5, 1.2)).toBeCloseTo(0.15);
    expect(motion.chase(0.5 + 1.0, 0.5, 1.2)).toBeCloseTo(0.15);
  });

  test('spins and blips', () => {
    expect(motion.spin(1.8, 3.6)).toBeCloseTo(180);
    expect(motion.blip(0.1, 0.2, 2.4)).toBe(0.08);
    expect(motion.blip(0.2, 0.2, 2.4)).toBe(1);
    expect(motion.cursorOn(3.2)).toBe(1);
    expect(motion.cursorOn(3.7)).toBe(0);
  });
});
