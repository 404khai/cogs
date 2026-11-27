import { useEffect, useId, useMemo, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import Svg, { Circle, ClipPath, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { chassisById, expressionById, lightNotch, luminance, RECESS_PAD, resolveCog, shade } from './core';
import type { CogConfig, CogInput, Gaze } from './core';
import { useReducedMotion } from './hooks';
import { Visor } from './Visor';

/** Unit fields as props. They override `unit`. */
export type CogFields = Partial<CogConfig>;

export type CogProps = CogFields & {
  /** The cog to draw: cog JSON exactly as the studio exports it, or a (partial) config. */
  unit?: CogInput;
  /** Width and height in points. Default 120. */
  size?: number;
  /**
   * Where the eyes look, -1..1 on each axis (x right, y down), scaled by curiosity.
   * Leave it out and the eyes wander on their own; there is no pointer to follow on a phone.
   */
  gaze?: Gaze | null;
  /** False holds the cog still: no blinks, glances, tweens or display animation. Default true. */
  animated?: boolean;
  /** Called with the fallbacks taken for invalid fields or JSON. */
  onWarnings?: (warnings: string[]) => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  testID?: string;
};

const AnimatedRect = Animated.createAnimatedComponent(Rect);

/** The status light's slow breathing (SMIL values="1;0.72;1" over 3.2s on the web). */
function usePulse(on: boolean) {
  const v = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!on) {
      v.setValue(1);
      return;
    }
    const half = { duration: 1600, easing: Easing.linear, useNativeDriver: false };
    const loop = Animated.loop(Animated.sequence([Animated.timing(v, { ...half, toValue: 0.72 }), Animated.timing(v, { ...half, toValue: 1 })]));
    loop.start();
    return () => loop.stop();
  }, [on, v]);
  return v;
}

/** Soft drop shadow without SVG filters: the outline, offset and widened in fading steps. */
const SHADOW = Array.from({ length: 8 }, (_, i) => ({ dy: 4 + i * 2.4, w: 2 + i * 4.5, o: 0.075 - i * 0.007 }));

/** A cog unit drawn with react-native-svg: wandering, blinking eyes, tweened expressions and animated displays. */
export function Cog({ unit, size = 120, gaze, animated = true, onWarnings, style, accessibilityLabel, testID, ...fields }: CogProps) {
  const uid = 'c' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const fieldKey = JSON.stringify(fields);
  const unitKey = typeof unit === 'string' ? unit : JSON.stringify(unit ?? null);
  const { config, warnings } = useMemo(() => resolveCog(unit, fields), [unitKey, fieldKey]);

  // Report once per distinct set of warnings, not on every render.
  const warnKey = warnings.join('\n');
  const onWarn = useRef(onWarnings);
  onWarn.current = onWarnings;
  useEffect(() => {
    if (warnKey) onWarn.current?.(warnKey.split('\n'));
  }, [warnKey]);

  const reduced = useReducedMotion();
  const moving = animated && !reduced;
  const pulse = usePulse(moving);

  const ch = chassisById(config.chassis);
  const expr = expressionById(config.expression);
  const optics = config.optics === 'auto' ? ch.optics : config.optics;
  const c = config.color;
  const lum = luminance(c);
  const v = ch.visor;
  const li = ch.light;
  const lcx = li.x + li.w / 2;
  const lcy = li.y + li.h / 2;
  const id = (s: string) => `${uid}-${s}`;
  const pad = RECESS_PAD;
  const { tab, recessTop } = lightNotch(ch);
  const led = 0.4 + 0.6 * config.charge;
  const lr = (grow: number) => (Math.min(li.w, li.h) + grow * 2) / 2;
  const shadowK = lum > 0.7 ? 0.8 : 1;

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 400 400"
      style={style}
      testID={testID}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel ?? `${config.name}, a ${ch.name.toLowerCase()} cog looking ${expr.name.toLowerCase()}`}
    >
      <Defs>
        <LinearGradient id={id('body')} x1="0.15" y1="0" x2="0.55" y2="1">
          <Stop offset="0" stopColor={shade(c, 0.1, 0.04)} />
          <Stop offset="0.45" stopColor={c} />
          <Stop offset="1" stopColor={shade(c, -0.1, 0.02)} />
        </LinearGradient>
        <LinearGradient id={id('sheen')} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#fff" stopOpacity={0.32} />
          <Stop offset="0.4" stopColor="#fff" stopOpacity={0} />
        </LinearGradient>
        <LinearGradient id={id('rim')} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={shade(c, -0.14)} />
          <Stop offset="1" stopColor={shade(c, 0.06)} />
        </LinearGradient>
        <LinearGradient id={id('rimU')} gradientUnits="userSpaceOnUse" x1="0" y1={recessTop} x2="0" y2={v.y + v.h + pad}>
          <Stop offset="0" stopColor={shade(c, -0.15)} />
          <Stop offset="0.5" stopColor={shade(c, -0.06)} />
          <Stop offset="1" stopColor={shade(c, 0.05)} />
        </LinearGradient>
        <LinearGradient id={id('screen')} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#10161d" />
          <Stop offset="0.35" stopColor="#030507" />
          <Stop offset="1" stopColor="#06090c" />
        </LinearGradient>
        <LinearGradient id={id('gloss')} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#fff" stopOpacity={0.22} />
          <Stop offset="1" stopColor="#fff" stopOpacity={0} />
        </LinearGradient>
        {/* Contact shadow: a radial fade stands in for the web's Gaussian blur. */}
        <RadialGradient id={id('soft')}>
          <Stop offset="0" stopColor={shade(c, -0.4)} stopOpacity={0.22} />
          <Stop offset="0.55" stopColor={shade(c, -0.4)} stopOpacity={0.12} />
          <Stop offset="1" stopColor={shade(c, -0.4)} stopOpacity={0} />
        </RadialGradient>
        <ClipPath id={id('clip')}>
          <Path d={ch.path} />
        </ClipPath>
        <ClipPath id={id('sclip')}>
          <Rect x={v.x} y={v.y} width={v.w} height={v.h} rx={v.r} />
        </ClipPath>
      </Defs>

      {/* contact shadow */}
      <Ellipse cx={200} cy={Math.min(ch.box[3] + 34, 382)} rx={(ch.box[2] - ch.box[0]) * 0.36 + 14} ry={20} fill={`url(#${id('soft')})`} />

      {/* body */}
      {SHADOW.map((s, i) => (
        <Path key={i} d={ch.path} fill={shade(c, -0.35)} stroke={shade(c, -0.35)} strokeWidth={s.w} strokeLinejoin="round" opacity={s.o * shadowK} transform={`translate(0 ${s.dy})`} />
      ))}
      <Path d={ch.path} fill={`url(#${id('body')})`} />
      <G clipPath={`url(#${id('clip')})`}>
        <Path d={ch.path} fill={`url(#${id('sheen')})`} />
        <Path d={ch.path} fill="none" stroke="#fff" strokeOpacity={lum > 0.75 ? 0.9 : 0.55} strokeWidth={6} transform="translate(0 3)" />
        <Path d={ch.path} fill="none" stroke={shade(c, -0.3)} strokeOpacity={0.35} strokeWidth={6} transform="translate(0 -3)" />
      </G>

      {/* fasteners */}
      {ch.screws.map(([x, y], i) => (
        <G key={i}>
          <Circle cx={x} cy={y + 1} r={7.2} fill="#fff" opacity={lum > 0.75 ? 0.8 : 0.4} />
          <Circle cx={x} cy={y} r={6.6} fill={shade(c, -0.52)} />
          <Circle cx={x - 1.2} cy={y - 1.4} r={2.2} fill={shade(c, -0.3)} />
        </G>
      ))}

      {/* recess: visor rim, merged with a notch for the status light when it sits right above */}
      <G fill={shade(c, 0.2)} opacity={lum > 0.75 ? 1 : 0.7} transform="translate(0 1.4)">
        <Rect x={v.x - pad} y={v.y - pad} width={v.w + pad * 2} height={v.h + pad * 2} rx={v.r + pad} />
        {tab && <Rect x={tab.x} y={tab.y} width={tab.w} height={tab.h} rx={tab.r} />}
      </G>
      <G fill={`url(#${id('rimU')})`}>
        <Rect x={v.x - pad} y={v.y - pad} width={v.w + pad * 2} height={v.h + pad * 2} rx={v.r + pad} />
        {tab && <Rect x={tab.x} y={tab.y} width={tab.w} height={tab.h} rx={tab.r} />}
      </G>

      {/* status light */}
      <G transform={li.angle ? `rotate(${li.angle} ${lcx} ${lcy})` : undefined}>
        {!tab && (
          <>
            <Rect x={li.x - 6} y={li.y - 6} width={li.w + 12} height={li.h + 12} rx={lr(6)} fill={shade(c, 0.2)} opacity={lum > 0.75 ? 1 : 0.7} transform="translate(0 1.2)" />
            <Rect x={li.x - 6} y={li.y - 6} width={li.w + 12} height={li.h + 12} rx={lr(6)} fill={`url(#${id('rim')})`} />
          </>
        )}
        {/* LED bloom: two halos in the glow colour in place of the web's blur filter. */}
        <Rect x={li.x - 8} y={li.y - 8} width={li.w + 16} height={li.h + 16} rx={lr(8)} fill={config.glow} opacity={0.16 * led} />
        <Rect x={li.x - 3.5} y={li.y - 3.5} width={li.w + 7} height={li.h + 7} rx={lr(3.5)} fill={config.glow} opacity={0.42 * led} />
        <AnimatedRect x={li.x} y={li.y} width={li.w} height={li.h} rx={lr(0)} fill={shade(config.glow, 0.38)} opacity={pulse} />
      </G>

      <Rect x={v.x - 2} y={v.y - 2} width={v.w + 4} height={v.h + 4} rx={v.r + 2} fill={shade(c, -0.45)} opacity={0.5} />
      <Rect x={v.x} y={v.y} width={v.w} height={v.h} rx={v.r} fill={`url(#${id('screen')})`} />
      <G clipPath={`url(#${id('sclip')})`}>
        <Visor uid={uid} visor={v} optics={optics} expr={expr} gaze={gaze} glow={config.glow} charge={config.charge}
          curiosity={config.curiosity} blink={config.blink} pupils={config.pupils} mode={config.screen} moving={moving} />
        <Rect x={v.x + v.r * 0.4} y={v.y + 3} width={v.w - v.r * 0.8} height={v.h * 0.16} rx={v.h * 0.08} fill={`url(#${id('gloss')})`} />
      </G>
    </Svg>
  );
}
