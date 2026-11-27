import { memo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Circle, ClipPath, Defs, Ellipse, G, Line, Mask, Path, Pattern, Polyline, RadialGradient, Rect, Stop } from 'react-native-svg';
import {
  createFace, eyeShape, eyeSlots, faceFrame, gearTrain, glyphCells, radarLayout, shade, stepFace,
  terminalLayout, thinkLayout, TYPING, typingDots, visorFrame, waveBars,
} from './core';
import type { EyeP, Expression, FaceFrame, Gaze, Optics, Rect as Box, ScreenMode, Slot } from './core';
import { useClock, useFrames } from './hooks';
import { blip, chase, cursorOn, dotHop, scroll, spin, triangle, waveScale } from './motion';

function Eye({ slot, p, gaze, blink, id, pupils, fill, dots, bloom }: {
  slot: Slot; p: EyeP; gaze: Gaze; blink: number; id: string; pupils: boolean; fill: string; dots: string; bloom: number;
}) {
  const { cx, cy, W, H, x0, y0, r, topY, pr, pcx, pcy, ox, oy, sy } = eyeShape(slot, p, gaze, blink);
  return (
    <G transform={`translate(${ox} ${oy}) translate(${cx} ${cy}) scale(1 ${sy}) translate(${-cx} ${-cy})`}>
      <Defs>
        <Mask id={id} maskUnits="userSpaceOnUse" x={x0 - W} y={y0 - H} width={W * 3} height={H * 3}>
          <Rect x={x0} y={y0} width={W} height={H} rx={r} fill="#fff" />
          {p.top > 0.005 && (
            <Rect x={cx - W * 1.5} y={topY - H * 2} width={W * 3} height={H * 2} fill="#000" transform={`rotate(${-p.tilt * slot.side} ${cx} ${topY})`} />
          )}
          {p.bottom > 0.005 && <Rect x={cx - W * 1.5} y={y0 + H - p.bottom * H} width={W * 3} height={H * 2} fill="#000" />}
          {p.cheek > 0.005 && <Ellipse cx={cx} cy={y0 + H * 1.5 - p.cheek * H * 0.95} rx={W * 0.8} ry={H * 0.62} fill="#000" />}
        </Mask>
      </Defs>
      {/* Bloom: the lit eye again, larger and faint, where the web blurs it. The mask scales with it, so lids still apply. */}
      <G opacity={bloom} transform={`translate(${cx} ${cy}) scale(1.16) translate(${-cx} ${-cy})`}>
        <G mask={`url(#${id})`}>
          <Rect x={x0} y={y0} width={W} height={H} fill={`url(#${fill})`} />
        </G>
      </G>
      <G mask={`url(#${id})`}>
        <Rect x={x0} y={y0} width={W} height={H} fill={`url(#${fill})`} />
        <Rect x={x0} y={y0} width={W} height={H} fill={`url(#${dots})`} />
        {pupils && pr > 0.5 && <Circle cx={pcx} cy={pcy} r={pr} fill="#03121a" opacity={0.9} />}
      </G>
    </G>
  );
}

/** Eyes with their own frame loop, so only the visor re-renders while they move. */
function Face({ uid, visor, optics, expr, gaze, curiosity, blink, charge, pupils, fill, dots, moving }: {
  uid: string; visor: Box; optics: Optics; expr: Expression; gaze?: Gaze | null; curiosity: number; blink: number; charge: number;
  pupils: boolean; fill: string; dots: string; moving: boolean;
}) {
  const live = useRef({ expr, gaze, curiosity, blink });
  live.current = { expr, gaze, curiosity, blink };
  const face = useRef<ReturnType<typeof createFace> | null>(null);
  const [frame, setFrame] = useState<FaceFrame | null>(null);

  useFrames(moving, (now) => {
    const s = (face.current ??= createFace(live.current.expr, now));
    const { expr: ex, gaze: g, curiosity: cu, blink: bl } = live.current;
    let look: Gaze | null = null;
    if (g) {
      const m = Math.hypot(g.x, g.y);
      const k = m > 1 ? 1 / m : 1;
      look = { x: g.x * k * cu, y: g.y * k * cu };
    }
    if (stepFace(s, now, { expr: ex, curiosity: cu, blink: bl, look })) setFrame(faceFrame(s));
  });

  // Still (reduced motion or animated={false}): pose the expression directly, eyes front.
  const f: FaceFrame = moving && frame ? frame : { L: expr.L, R: expr.R, gaze: { x: 0, y: 0 }, blink: 0 };
  const ss = eyeSlots(visor, optics);
  return (
    <>
      {ss.map((s, i) => (
        <Eye key={i} slot={s} p={ss.length === 1 ? f.L : i === 0 ? f.L : f.R} gaze={f.gaze} blink={f.blink} id={`${uid}-m${i}`} pupils={pupils} fill={fill} dots={dots} bloom={0.18 + 0.3 * charge} />
      ))}
    </>
  );
}

/** An agent display (everything but the eyes), drawn at time t. */
function Display({ uid, v, mode, t, fill, dots, lit }: { uid: string; v: Box; mode: ScreenMode; t: number; fill: string; dots: string; lit: string }) {
  const { cx, cy, unit } = visorFrame(v);
  if (mode === 'glyph') {
    return <>{glyphCells(v).map((c) => <Rect key={c.key} x={c.x} y={c.y} width={c.size} height={c.size} rx={c.r} fill={`url(#${fill})`} />)}</>;
  }
  if (mode === 'wave') {
    return (
      <>
        {waveBars(v).map((b, i) => {
          const h = b.h * waveScale(t, b.delay, b.dur);
          return <Rect key={i} x={b.x} y={b.cy - h / 2} width={b.w} height={h} rx={Math.min(b.r, h / 2)} fill={`url(#${fill})`} />;
        })}
      </>
    );
  }
  if (mode === 'dots') {
    return (
      <>
        {typingDots(v).map((d) => {
          const { dy, opacity } = dotHop(t, d.delay, TYPING.dur, TYPING.hop);
          return <Circle key={d.k} cx={d.cx} cy={d.cy + dy} r={d.r} fill={`url(#${fill})`} opacity={opacity} />;
        })}
      </>
    );
  }
  if (mode === 'think') {
    const k = thinkLayout(v);
    const r = k.core.from + (k.core.to - k.core.from) * triangle(t, k.core.dur);
    return (
      <G>
        {k.leds.map((l, i) => <Circle key={i} cx={l.cx} cy={l.cy} r={l.r} fill={lit} opacity={chase(t, l.begin, k.dur)} />)}
        <Circle cx={k.cx} cy={k.cy} r={r} fill={`url(#${fill})`} />
        <G transform={`rotate(${360 - spin(t, k.orbit.dur)} ${k.cx} ${k.cy})`}>
          {k.sats.map((s) => <Circle key={s.k} cx={s.cx} cy={s.cy} r={s.r} fill={lit} opacity={0.75} />)}
        </G>
      </G>
    );
  }
  if (mode === 'search') {
    const { R, dur, sw, beam, blips } = radarLayout(v);
    return (
      <G>
        <Circle cx={cx} cy={cy} r={R} fill="none" stroke={lit} strokeOpacity={0.6} strokeWidth={sw * 1.2} />
        <Circle cx={cx} cy={cy} r={R * 0.55} fill="none" stroke={lit} strokeOpacity={0.4} strokeWidth={sw} />
        <Line x1={cx - R} x2={cx + R} y1={cy} y2={cy} stroke={lit} strokeOpacity={0.28} strokeWidth={sw} />
        <Line x1={cx} x2={cx} y1={cy - R} y2={cy + R} stroke={lit} strokeOpacity={0.28} strokeWidth={sw} />
        <G transform={`rotate(${spin(t, dur)} ${cx} ${cy})`}>
          <Path d={beam} fill={lit} opacity={0.38} />
          <Line x1={cx} y1={cy} x2={cx + R} y2={cy} stroke="#fff" strokeWidth={sw * 1.4} strokeLinecap="round" />
        </G>
        {blips.map((b) => <Circle key={b.deg} cx={b.cx} cy={b.cy} r={b.r} fill={`url(#${fill})`} opacity={blip(t, b.begin, dur)} />)}
        <Circle cx={cx} cy={cy} r={unit * 2.4} fill="#fff" />
      </G>
    );
  }
  if (mode === 'code') {
    const k = terminalLayout(v);
    const clip = `${uid}-cc`;
    return (
      <G>
        <Defs>
          <ClipPath id={clip}>
            <Rect x={k.clip.x} y={k.clip.y} width={k.clip.w} height={k.clip.h} />
          </ClipPath>
        </Defs>
        <G clipPath={`url(#${clip})`}>
          <G transform={`translate(0 ${-scroll(t, k.scroll.by, k.scroll.dur)})`}>
            {k.tokens.map((o) => <Rect key={o.key} x={o.x} y={o.y} width={o.w} height={o.h} rx={o.r} fill={o.head ? '#fff' : lit} opacity={o.head ? 0.95 : 0.7} />)}
          </G>
        </G>
        <Polyline points={k.prompt} fill="none" stroke={lit} strokeWidth={k.unit * 2.4} strokeLinecap="round" strokeLinejoin="round" />
        <Rect x={k.cursor.x} y={k.cursor.y} width={k.cursor.w} height={k.cursor.h} rx={k.cursor.r} fill="#fff" opacity={cursorOn(t)} />
      </G>
    );
  }
  // work
  return (
    <G>
      {gearTrain(v).map((g, i) => (
        <G key={i} transform={`rotate(${g.dir * spin(t, g.dur)} ${g.gx} ${g.gy})`}>
          <Path d={g.body} fill={`url(#${fill})`} />
          <Path d={g.body} fill={`url(#${dots})`} />
          {g.holes.map((h, k) => <Circle key={k} cx={h.cx} cy={h.cy} r={h.r} fill="#04070a" />)}
          <Circle cx={g.gx} cy={g.gy} r={g.pitch * 0.24} fill="#04070a" />
          <Circle cx={g.gx} cy={g.gy} r={g.pitch * 0.09} fill={lit} />
        </G>
      ))}
    </G>
  );
}

/** A display ticking on its own clock, so the rest of the cog stays put. */
function LiveDisplay(props: Omit<Parameters<typeof Display>[0], 't'> & { moving: boolean }) {
  const t = useClock(props.moving);
  return <Display {...props} t={t} />;
}

export type VisorProps = {
  uid: string;
  visor: Box;
  optics: Optics;
  expr: Expression;
  gaze?: Gaze | null;
  glow: string;
  charge: number;
  curiosity: number;
  blink: number;
  pupils: boolean;
  mode: ScreenMode;
  /** False holds every animation still. */
  moving: boolean;
};

/**
 * The lit contents of a visor, as the web's Eyes. react-native-svg has no filters, so the LED bloom
 * there (a Gaussian blur) is carried by the ambient glow here.
 */
export const Visor = memo(function Visor({ uid, visor: v, optics, expr, gaze, glow, charge, curiosity, blink, pupils, mode, moving }: VisorProps) {
  const fill = `${uid}-ef`;
  const dots = `${uid}-ed`;
  const amb = `${uid}-ea`;
  const { cx, cy, unit } = visorFrame(v);
  const lit = shade(glow, 0.28);

  let content: ReactNode;
  if (mode === 'eyes') {
    content = <Face uid={uid} visor={v} optics={optics} expr={expr} gaze={gaze} curiosity={curiosity} blink={blink} charge={charge} pupils={pupils} fill={fill} dots={dots} moving={moving} />;
  } else {
    content = <LiveDisplay uid={uid} v={v} mode={mode} fill={fill} dots={dots} lit={lit} moving={moving} />;
  }

  return (
    <G opacity={0.35 + 0.65 * Math.min(1, charge * 1.4)}>
      <Defs>
        <RadialGradient id={fill} cx="50%" cy="45%" r="65%">
          <Stop offset="0" stopColor="#ffffff" />
          <Stop offset="0.45" stopColor={shade(glow, 0.22)} />
          <Stop offset="1" stopColor={glow} />
        </RadialGradient>
        <Pattern id={dots} width={3.4 * unit} height={3.4 * unit} patternUnits="userSpaceOnUse">
          <Circle cx={1.7 * unit} cy={1.7 * unit} r={0.95 * unit} fill="#fff" opacity={0.55} />
        </Pattern>
        <RadialGradient id={amb}>
          <Stop offset="0" stopColor={glow} stopOpacity={0.42 * charge} />
          <Stop offset="1" stopColor={glow} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Ellipse cx={cx} cy={cy} rx={v.w * 0.55} ry={v.h * 0.6} fill={`url(#${amb})`} />
      {content}
    </G>
  );
});
