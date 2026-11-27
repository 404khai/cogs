import type { ReactNode } from 'react';
import type { Rect, Optics } from '../lib/chassis';
import type { EyeP } from '../lib/expressions';
import type { ScreenMode } from '../lib/config';
import { shade } from '../lib/color';
import { eyeSlots } from '../lib/face';
import type { Slot } from '../lib/face';
import { eyeShape, gearTrain, glyphCells, radarLayout, terminalLayout, thinkLayout, typingDots, visorFrame, waveBars } from '../lib/displays';

function Eye({ slot, p, gaze, blink, id, pupils, fill, dots }: {
  slot: Slot; p: EyeP; gaze: { x: number; y: number }; blink: number; id: string; pupils: boolean; fill: string; dots: string;
}) {
  const { cx, cy, W, H, x0, y0, r, topY, pr, pcx, pcy, ox, oy, sy } = eyeShape(slot, p, gaze, blink);

  return (
    <g transform={`translate(${ox} ${oy}) translate(${cx} ${cy}) scale(1 ${sy}) translate(${-cx} ${-cy})`}>
      <mask id={id} maskUnits="userSpaceOnUse" x={x0 - W} y={y0 - H} width={W * 3} height={H * 3}>
        <rect x={x0} y={y0} width={W} height={H} rx={r} fill="#fff" />
        {p.top > 0.005 && (
          <rect x={cx - W * 1.5} y={topY - H * 2} width={W * 3} height={H * 2} fill="#000" transform={`rotate(${-p.tilt * slot.side} ${cx} ${topY})`} />
        )}
        {p.bottom > 0.005 && <rect x={cx - W * 1.5} y={y0 + H - p.bottom * H} width={W * 3} height={H * 2} fill="#000" />}
        {p.cheek > 0.005 && <ellipse cx={cx} cy={y0 + H * 1.5 - p.cheek * H * 0.95} rx={W * 0.8} ry={H * 0.62} fill="#000" />}
      </mask>
      <g mask={`url(#${id})`}>
        <rect x={x0} y={y0} width={W} height={H} fill={`url(#${fill})`} />
        <rect x={x0} y={y0} width={W} height={H} fill={`url(#${dots})`} />
        {pupils && pr > 0.5 && <circle cx={pcx} cy={pcy} r={pr} fill="#03121a" opacity={0.9} />}
      </g>
    </g>
  );
}

export type EyesProps = {
  uid: string;
  visor: Rect;
  optics: Optics;
  L: EyeP;
  R: EyeP;
  gaze: { x: number; y: number };
  blink: number;
  glow: string;
  charge: number;
  pupils: boolean;
  mode: ScreenMode;
};

/** The lit contents of a visor. Render inside an <svg>. */
export function Eyes({ uid, visor: v, optics, L, R, gaze, blink, glow, charge, pupils, mode }: EyesProps) {
  const fill = `${uid}-ef`;
  const dots = `${uid}-ed`;
  const filt = `${uid}-eg`;
  const amb = `${uid}-ea`;
  const ss = eyeSlots(v, optics);
  const { cx, cy, unit } = visorFrame(v);
  const blur = (1.5 + charge * 4.5) * unit;
  const lit = shade(glow, 0.28);

  let content: ReactNode = null;
  if (mode === 'eyes') {
    content = ss.map((s, i) => (
      <Eye key={i} slot={s} p={ss.length === 1 ? L : i === 0 ? L : R} gaze={gaze} blink={blink} id={`${uid}-m${i}`} pupils={pupils} fill={fill} dots={dots} />
    ));
  } else if (mode === 'glyph') {
    content = glyphCells(v).map((c) => <rect key={c.key} x={c.x} y={c.y} width={c.size} height={c.size} rx={c.r} fill={`url(#${fill})`} />);
  } else if (mode === 'wave') {
    content = waveBars(v).map((b, i) => (
      <rect key={i} className="cog-wave" style={{ animationDelay: `${b.delay}s`, animationDuration: `${b.dur}s` }}
        x={b.x} y={b.y} width={b.w} height={b.h} rx={b.r} fill={`url(#${fill})`} />
    ));
  } else if (mode === 'dots') {
    content = typingDots(v).map((d) => (
      <circle key={d.k} className="cog-dot" style={{ animationDelay: `${d.delay}s` }} cx={d.cx} cy={d.cy} r={d.r} fill={`url(#${fill})`} />
    ));
  } else if (mode === 'think') {
    const t = thinkLayout(v);
    content = (
      <g>
        {t.leds.map((l, i) => (
          <circle key={i} cx={l.cx} cy={l.cy} r={l.r} fill={lit} opacity={0.15}>
            <animate attributeName="opacity" values="1;0.15;0.15" keyTimes="0;0.6;1" dur={`${t.dur}s`} begin={`${l.begin}s`} repeatCount="indefinite" />
          </circle>
        ))}
        <circle cx={t.cx} cy={t.cy} r={t.core.r} fill={`url(#${fill})`}>
          <animate attributeName="r" values={`${t.core.from};${t.core.to};${t.core.from}`} dur={`${t.core.dur}s`} repeatCount="indefinite" />
        </circle>
        <g>
          <animateTransform attributeName="transform" type="rotate" from={`360 ${t.cx} ${t.cy}`} to={`0 ${t.cx} ${t.cy}`} dur={`${t.orbit.dur}s`} repeatCount="indefinite" />
          {t.sats.map((s) => <circle key={s.k} cx={s.cx} cy={s.cy} r={s.r} fill={lit} opacity={0.75} />)}
        </g>
      </g>
    );
  } else if (mode === 'search') {
    const { R, dur, sw, beam, blips } = radarLayout(v);
    content = (
      <g>
        <circle cx={cx} cy={cy} r={R} fill="none" stroke={lit} strokeOpacity={0.6} strokeWidth={sw * 1.2} />
        <circle cx={cx} cy={cy} r={R * 0.55} fill="none" stroke={lit} strokeOpacity={0.4} strokeWidth={sw} />
        <line x1={cx - R} x2={cx + R} y1={cy} y2={cy} stroke={lit} strokeOpacity={0.28} strokeWidth={sw} />
        <line x1={cx} x2={cx} y1={cy - R} y2={cy + R} stroke={lit} strokeOpacity={0.28} strokeWidth={sw} />
        <g>
          <animateTransform attributeName="transform" type="rotate" from={`0 ${cx} ${cy}`} to={`360 ${cx} ${cy}`} dur={`${dur}s`} repeatCount="indefinite" />
          <path d={beam} fill={lit} opacity={0.38} />
          <line x1={cx} y1={cy} x2={cx + R} y2={cy} stroke="#fff" strokeWidth={sw * 1.4} strokeLinecap="round" />
        </g>
        {blips.map((b) => (
          <circle key={b.deg} cx={b.cx} cy={b.cy} r={b.r} fill={`url(#${fill})`} opacity={0.08}>
            <animate attributeName="opacity" values="1;0.08" dur={`${dur}s`} begin={`${b.begin}s`} repeatCount="indefinite" />
          </circle>
        ))}
        <circle cx={cx} cy={cy} r={unit * 2.4} fill="#fff" />
      </g>
    );
  } else if (mode === 'code') {
    const t = terminalLayout(v);
    const clip = `${uid}-cc`;
    content = (
      <g>
        <defs>
          <clipPath id={clip}>
            <rect x={t.clip.x} y={t.clip.y} width={t.clip.w} height={t.clip.h} />
          </clipPath>
        </defs>
        <g clipPath={`url(#${clip})`}>
          <g>
            <animateTransform attributeName="transform" type="translate" from="0 0" to={`0 ${-t.scroll.by}`} dur={`${t.scroll.dur}s`} repeatCount="indefinite" />
            {t.tokens.map((k) => (
              <rect key={k.key} x={k.x} y={k.y} width={k.w} height={k.h} rx={k.r} fill={k.head ? '#fff' : lit} opacity={k.head ? 0.95 : 0.7} />
            ))}
          </g>
        </g>
        <polyline points={t.prompt} fill="none" stroke={lit} strokeWidth={t.unit * 2.4} strokeLinecap="round" strokeLinejoin="round" />
        <rect x={t.cursor.x} y={t.cursor.y} width={t.cursor.w} height={t.cursor.h} rx={t.cursor.r} fill="#fff">
          <animate attributeName="opacity" values="1;0" dur="1s" calcMode="discrete" repeatCount="indefinite" />
        </rect>
      </g>
    );
  } else {
    content = (
      <g>
        {gearTrain(v).map((g, i) => (
          <g key={i}>
            <animateTransform attributeName="transform" type="rotate" from={`0 ${g.gx} ${g.gy}`} to={`${360 * g.dir} ${g.gx} ${g.gy}`} dur={`${g.dur}s`} repeatCount="indefinite" />
            <path d={g.body} fill={`url(#${fill})`} />
            <path d={g.body} fill={`url(#${dots})`} />
            {g.holes.map((h, k) => <circle key={k} cx={h.cx} cy={h.cy} r={h.r} fill="#04070a" />)}
            <circle cx={g.gx} cy={g.gy} r={g.pitch * 0.24} fill="#04070a" />
            <circle cx={g.gx} cy={g.gy} r={g.pitch * 0.09} fill={lit} />
          </g>
        ))}
      </g>
    );
  }

  return (
    <g opacity={0.35 + 0.65 * Math.min(1, charge * 1.4)}>
      <defs>
        <radialGradient id={fill} cx="50%" cy="45%" r="65%">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.45" stopColor={shade(glow, 0.22)} />
          <stop offset="1" stopColor={glow} />
        </radialGradient>
        <pattern id={dots} width={3.4 * unit} height={3.4 * unit} patternUnits="userSpaceOnUse">
          <circle cx={1.7 * unit} cy={1.7 * unit} r={0.95 * unit} fill="#fff" opacity="0.55" />
        </pattern>
        <radialGradient id={amb}>
          <stop offset="0" stopColor={glow} stopOpacity={0.32 * charge} />
          <stop offset="1" stopColor={glow} stopOpacity="0" />
        </radialGradient>
        <filter id={filt} x="-50%" y="-50%" width="200%" height="200%" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceGraphic" stdDeviation={blur} result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <ellipse cx={cx} cy={cy} rx={v.w * 0.55} ry={v.h * 0.6} fill={`url(#${amb})`} />
      <g filter={`url(#${filt})`}>{content}</g>
    </g>
  );
}
