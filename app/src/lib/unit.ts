import { DEFAULT, parseCog } from './config';
import type { CogConfig } from './config';

/** A cog: a config object, or cog JSON exactly as the studio exports it. */
export type CogInput = Partial<CogConfig> | string;

/**
 * Build a valid config from cog JSON or a partial config, plus field overrides (undefined ones are ignored).
 * Like the studio, missing or invalid values fall back to the defaults with a warning each.
 */
export function resolveCog(unit?: CogInput, fields: Partial<CogConfig> = {}): { config: CogConfig; warnings: string[] } {
  const warnings: string[] = [];
  let base: unknown = unit;
  if (typeof unit === 'string') {
    try {
      base = JSON.parse(unit);
    } catch (e) {
      warnings.push(`Invalid JSON: ${(e as Error).message}`);
      base = undefined;
    }
  }
  if (base !== undefined && (!base || typeof base !== 'object' || Array.isArray(base))) {
    warnings.push('Expected a JSON object describing a cog.');
    base = undefined;
  }
  const set = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined));
  const res = parseCog(JSON.stringify({ ...DEFAULT, ...(base as object | undefined), ...set }));
  if ('error' in res) return { config: { ...DEFAULT }, warnings: [...warnings, res.error] };
  return { config: res.config, warnings: [...warnings, ...res.warnings] };
}
