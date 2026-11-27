import type { CSSProperties, ReactNode, Ref } from 'react';
import { useEffect } from 'react';
import { Cog as Unit } from '../../../app/src/components/Cog';
import { CogAvatar as KitAvatar, CogTyping as KitTyping } from '../../../app/src/kit/CogKit';
import type { Presence } from '../../../app/src/kit/CogKit';
import { DEFAULT, parseCog } from '../../../app/src/lib/config';
import type { CogConfig, ScreenMode } from '../../../app/src/lib/config';
import type { ChassisId, ExpressionId } from './ids';

/** A cog: a config object, or cog JSON exactly as the studio exports it. */
export type CogInput = Partial<CogConfig> | string;

/** Unit fields as props. `string & {}` keeps autocomplete for the known ids. */
export type CogFields = Partial<Omit<CogConfig, 'chassis' | 'expression'>> & {
  chassis?: ChassisId | (string & {});
  expression?: ExpressionId | (string & {});
};

/**
 * Build a valid config from cog JSON or a partial config, plus field overrides.
 * Like the studio, missing or invalid values fall back to the defaults with a warning each.
 */
export function resolveCog(unit?: CogInput, fields: CogFields = {}): { config: CogConfig; warnings: string[] } {
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

function useResolved(unit: CogInput | undefined, fields: CogFields, onWarnings?: (warnings: string[]) => void) {
  const { config, warnings } = resolveCog(unit, fields);
  const key = warnings.join('\n');
  useEffect(() => {
    if (key) onWarnings?.(key.split('\n'));
    // Report once per distinct set of warnings, not on every render.
  }, [key]);
  return config;
}

export type CogProps = CogFields & {
  /** The cog to draw. Individual field props (chassis, expression, screen…) override it. */
  unit?: CogInput;
  /** Width and height (px or any CSS length). Defaults to the width of the container. */
  size?: number | string;
  /** Follow the pointer with the eyes. Default true. */
  track?: boolean;
  /** Called with the fallbacks taken for invalid fields or JSON. */
  onWarnings?: (warnings: string[]) => void;
  /** Class and style for the wrapping span, which sizes the SVG. */
  className?: string;
  style?: CSSProperties;
  svgRef?: Ref<SVGSVGElement>;
};

/** A cog unit as a live SVG: eyes that track, glance and blink, tweened expressions and animated displays. */
export function Cog({ unit, size, track = true, onWarnings, className, style, svgRef, ...fields }: CogProps) {
  const config = useResolved(unit, fields, onWarnings);
  // An SVG with only a viewBox fills its box's width, so the span sets the size and needs no stylesheet.
  return (
    <span className={className} style={{ display: 'inline-block', verticalAlign: 'middle', lineHeight: 0, width: size ?? '100%', ...style }}>
      <Unit config={config} track={track} svgRef={svgRef} />
    </span>
  );
}

export type { Presence };

export type CogAvatarProps = {
  unit?: CogInput;
  /** Square size in px. Default 56. */
  size?: number;
  /** Presence lamp. `away` closes the eyes, `offline` powers the unit down. */
  presence?: Presence;
  /** Override the unit's display, e.g. `think` while an agent works. */
  screen?: ScreenMode;
  onWarnings?: (warnings: string[]) => void;
};

/** The unit in a socket, with an optional presence lamp. Needs `@cogs/react/styles.css`. */
export function CogAvatar({ unit, onWarnings, ...rest }: CogAvatarProps) {
  return <KitAvatar unit={useResolved(unit, {}, onWarnings)} {...rest} />;
}

export type CogTypingProps = {
  unit?: CogInput;
  /** What the avatar shows while it works. Default `dots`. */
  screen?: ScreenMode;
  children: ReactNode;
  onWarnings?: (warnings: string[]) => void;
};

/** An inline "unit is working" status line. Needs `@cogs/react/styles.css`. */
export function CogTyping({ unit, onWarnings, ...rest }: CogTypingProps) {
  return <KitTyping unit={useResolved(unit, {}, onWarnings)} {...rest} />;
}
