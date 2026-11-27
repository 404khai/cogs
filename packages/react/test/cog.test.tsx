// Tests the built bundle (dist), which is what ships. `bun run build` first.
import { describe, expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  CHASSIS, CHASSIS_IDS, Cog, CogAvatar, CogTyping, DEFAULT, EXPRESSIONS, EXPRESSION_IDS, LOGO, SCREENS, resolveCog, toJSON,
} from '../dist/index.js';

const svg = (el: React.ReactElement) => renderToStaticMarkup(el);

describe('ids', () => {
  test('chassis ids match the renderer', () => expect([...CHASSIS_IDS]).toEqual(CHASSIS.map((c) => c.id)));
  test('expression ids match the renderer', () => expect([...EXPRESSION_IDS]).toEqual(EXPRESSIONS.map((x) => x.id)));
});

describe('resolveCog', () => {
  test('defaults with no input', () => expect(resolveCog()).toEqual({ config: DEFAULT, warnings: [] }));
  test('reads cog JSON from the studio', () => expect(resolveCog(toJSON(LOGO)).config).toEqual(LOGO));
  test('fields override the unit', () => {
    const { config } = resolveCog(LOGO, { expression: 'happy', screen: 'think', color: undefined });
    expect(config).toEqual({ ...LOGO, expression: 'happy', screen: 'think' });
  });
  test('invalid values fall back with a warning each', () => {
    const { config, warnings } = resolveCog({ chassis: 'nope', color: 'red', charge: 4 } as never);
    expect(config.chassis).toBe(DEFAULT.chassis);
    expect(config.color).toBe(DEFAULT.color);
    expect(config.charge).toBe(1);
    expect(warnings).toHaveLength(2);
  });
  test('broken JSON falls back to the default unit', () => {
    const { config, warnings } = resolveCog('{"chassis": ');
    expect(config).toEqual(DEFAULT);
    expect(warnings[0]).toStartWith('Invalid JSON');
  });
  test('non-object JSON is rejected', () => expect(resolveCog('[1, 2]').warnings).toEqual(['Expected a JSON object describing a cog.']));
});

describe('Cog', () => {
  test('every chassis × display renders', () => {
    for (const ch of CHASSIS_IDS)
      for (const s of SCREENS) {
        const out = svg(<Cog chassis={ch} screen={s.id} track={false} />);
        expect(out).toStartWith('<span');
        expect(out).toContain('<svg');
        expect(out).toContain(`a ${CHASSIS.find((c) => c.id === ch)!.name.toLowerCase()} cog`);
      }
  });
  test('every expression renders', () => {
    for (const x of EXPRESSIONS) expect(svg(<Cog expression={x.id} />)).toContain(`looking ${x.name.toLowerCase()}`);
  });
  test('size sets width and height', () => expect(svg(<Cog size={96} />)).toContain('width:96px'));
  test('takes cog JSON', () => expect(svg(<Cog unit={toJSON(LOGO)} />)).toContain('aria-label="Flange, a sprocket cog looking angry"'));
  test('two cogs on a page get distinct ids', () => {
    const out = svg(<><Cog /><Cog /></>);
    const ids = [...out.matchAll(/ id="([^"]+)-body"/g)].map((m) => m[1]);
    expect(new Set(ids).size).toBe(2);
  });
});

describe('CogAvatar and CogTyping', () => {
  test('avatar has a presence lamp', () => {
    const out = svg(<CogAvatar unit={LOGO} presence="away" size={40} />);
    expect(out).toContain('cog-avatar away');
    expect(out).toContain('cog-avatar-lamp');
    expect(out).toContain('looking sleepy');
  });
  test('typing line', () => expect(svg(<CogTyping unit={toJSON(LOGO)}>Flange is typing</CogTyping>)).toContain('Flange is typing'));
});
