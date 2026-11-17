import { CHASSIS } from './chassis';
import { EXPRESSIONS } from './expressions';

export type ScreenMode = 'eyes' | 'glyph' | 'wave' | 'dots';
export type OpticsMode = 'auto' | 'mono' | 'dual';

export type CogConfig = {
  name: string;
  chassis: string;
  color: string;
  glow: string;
  expression: string;
  screen: ScreenMode;
  optics: OpticsMode;
  pupils: boolean;
  charge: number;
  curiosity: number;
  blink: number;
};

export const PAINTS = [
  { name: 'Sky', hex: '#7cc9ea' },
  { name: 'Coral', hex: '#e8603f' },
  { name: 'Mint', hex: '#72c97c' },
  { name: 'Lilac', hex: '#9d8df0' },
  { name: 'Alloy', hex: '#d3d3cf' },
  { name: 'Orchid', hex: '#e46fdc' },
  { name: 'Cobalt', hex: '#3657d8' },
  { name: 'Lemon', hex: '#efe06a' },
  { name: 'Volt', hex: '#ff6a2b' },
  { name: 'Carbon', hex: '#3b3f46' },
];

export const GLOWS = [
  { name: 'Cyan', hex: '#46d6ff' },
  { name: 'Ice', hex: '#bfefff' },
  { name: 'Amber', hex: '#ffb23f' },
  { name: 'Lime', hex: '#9dff5c' },
  { name: 'Rose', hex: '#ff6fa8' },
];

export const DEFAULT: CogConfig = {
  name: 'Rivet',
  chassis: 'octa',
  color: '#7cc9ea',
  glow: '#46d6ff',
  expression: 'idle',
  screen: 'eyes',
  optics: 'auto',
  pupils: true,
  charge: 0.78,
  curiosity: 0.7,
  blink: 0.5,
};

/** The house unit: our logo. */
export const LOGO: CogConfig = {
  ...DEFAULT,
  name: 'Flange',
  chassis: 'gear',
  color: '#e8603f',
  glow: '#ffb23f',
  expression: 'angry',
  pupils: false,
};

const mk = (p: Partial<CogConfig>): CogConfig => ({ ...DEFAULT, ...p });

export const ROSTER: (CogConfig & { role: string })[] = [
  { ...mk({ name: 'Rivet', chassis: 'octa', color: '#7cc9ea' }), role: 'Code review' },
  { ...mk({ name: 'Piston', chassis: 'capsule', color: '#e8603f', expression: 'focused' }), role: 'Incident triage' },
  { ...mk({ name: 'Sprocket', chassis: 'tab', color: '#72c97c', expression: 'happy' }), role: 'Onboarding' },
  { ...mk({ name: 'Gimbal', chassis: 'hex', color: '#9d8df0', expression: 'lookup' }), role: 'Research' },
  { ...mk({ name: 'Gasket', chassis: 'drop', color: '#d3d3cf', expression: 'suspicious', glow: '#bfefff' }), role: 'Security audit' },
  { ...mk({ name: 'Spindle', chassis: 'chamfer', color: '#e46fdc', screen: 'dots' }), role: 'Docs writer' },
  { ...mk({ name: 'Pinion', chassis: 'bloom', color: '#3657d8', screen: 'wave' }), role: 'Voice agent' },
  { ...mk({ name: 'Ratchet', chassis: 'gear', color: '#ff6a2b', expression: 'angry', glow: '#ffb23f' }), role: 'CI runner' },
];

const NAMES = [
  'Rivet', 'Sprocket', 'Ratchet', 'Gasket', 'Piston', 'Spindle', 'Pinion', 'Gimbal', 'Flange', 'Bushing',
  'Grommet', 'Clevis', 'Tappet', 'Detent', 'Pawl', 'Shim', 'Dowel', 'Collet', 'Cotter', 'Spline',
  'Caster', 'Axle', 'Clutch', 'Knurl', 'Bolt', 'Washer', 'Hinge', 'Socket', 'Lever', 'Cam',
  'Torque', 'Valve', 'Coil', 'Servo', 'Anvil', 'Crank', 'Toggle', 'Bracket', 'Swivel', 'Sprue',
];
const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)];

export const randomName = (not?: string) => pick(NAMES.filter((n) => n !== not));

export function randomConfig(prev: CogConfig): CogConfig {
  const r = Math.random();
  return {
    ...prev,
    name: randomName(prev.name),
    chassis: pick(CHASSIS).id,
    color: pick(PAINTS).hex,
    glow: Math.random() < 0.6 ? GLOWS[0].hex : pick(GLOWS).hex,
    expression: pick(EXPRESSIONS).id,
    screen: r < 0.78 ? 'eyes' : r < 0.86 ? 'wave' : r < 0.94 ? 'dots' : 'glyph',
    optics: 'auto',
    pupils: Math.random() < 0.75,
  };
}

export function serial(c: CogConfig): string {
  const s = JSON.stringify([c.chassis, c.color, c.glow, c.expression, c.screen, c.optics, c.name]);
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  const hex = h.toString(16).toUpperCase().padStart(8, '0');
  return `${hex.slice(0, 2)}-${hex.slice(2, 6)}-${hex.slice(6, 8)}`;
}

export function encodeConfig(c: CogConfig) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(c))));
}

export function decodeConfig(s: string): CogConfig | null {
  try {
    const res = parseCog(decodeURIComponent(escape(atob(s))));
    return 'config' in res ? res.config : null;
  } catch {
    return null;
  }
}

const HEX = /^#[0-9a-f]{6}$/i;
const clamp01 = (n: unknown, fallback: number) => (typeof n === 'number' && isFinite(n) ? Math.min(1, Math.max(0, n)) : fallback);

/** Portable JSON form of a cog. */
export function toJSON(c: CogConfig): string {
  return JSON.stringify({ $schema: 'cogs/unit@1', ...c }, null, 2);
}

/** Parse pasted / uploaded JSON into a valid config. Unknown or bad fields fall back to defaults and are reported. */
export function parseCog(text: string): { config: CogConfig; warnings: string[] } | { error: string } {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    return { error: `Invalid JSON: ${(e as Error).message}` };
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { error: 'Expected a JSON object describing a cog.' };
  const r = raw as Record<string, unknown>;
  if (!('chassis' in r) && !('expression' in r) && !('color' in r)) return { error: 'No cog fields found (chassis, color, expression…).' };

  const warnings: string[] = [];
  const oneOf = <T extends string>(key: string, ok: readonly T[], fallback: T): T => {
    if (r[key] === undefined) return fallback;
    if (ok.includes(r[key] as T)) return r[key] as T;
    warnings.push(`${key}: "${String(r[key])}" unknown, using "${fallback}"`);
    return fallback;
  };
  const hex = (key: string, fallback: string) => {
    if (r[key] === undefined) return fallback;
    if (typeof r[key] === 'string' && HEX.test(r[key] as string)) return (r[key] as string).toLowerCase();
    warnings.push(`${key}: expected #rrggbb`);
    return fallback;
  };

  return {
    warnings,
    config: {
      name: typeof r.name === 'string' && r.name.trim() ? r.name.trim().slice(0, 16) : DEFAULT.name,
      chassis: oneOf('chassis', CHASSIS.map((c) => c.id), DEFAULT.chassis),
      color: hex('color', DEFAULT.color),
      glow: hex('glow', DEFAULT.glow),
      expression: oneOf('expression', EXPRESSIONS.map((x) => x.id), DEFAULT.expression),
      screen: oneOf<ScreenMode>('screen', ['eyes', 'glyph', 'wave', 'dots'], DEFAULT.screen),
      optics: oneOf<OpticsMode>('optics', ['auto', 'mono', 'dual'], DEFAULT.optics),
      pupils: typeof r.pupils === 'boolean' ? r.pupils : DEFAULT.pupils,
      charge: clamp01(r.charge, DEFAULT.charge),
      curiosity: clamp01(r.curiosity, DEFAULT.curiosity),
      blink: clamp01(r.blink, DEFAULT.blink),
    },
  };
}
