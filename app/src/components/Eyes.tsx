import type { ReactNode } from 'react';
import type { Rect, Optics } from '../lib/chassis';
import type { EyeP } from '../lib/expressions';
import type { ScreenMode } from '../lib/config';
import { shade } from '../lib/color';
import { gearPoints, roundedPoly } from '../lib/chassis';
import { meshChain } from '../lib/gears';

type Slot = { cx: number; cy: number; w: number; h: number; side: number };

function slots(v: Rect, optics: Optics): Slot[] {
  const cx = v.x + v.w / 2;
  const cy = v.y + v.h / 2;
  if (optics === 'mono') {
    const s = Math.min(v.w * 0.6, v.h * 0.68);
    return [{ cx, cy, w: s, h: s, side: 1 }];
  }
  const w = Math.min(v.w * 0.33, v.h * 0.78);
  const h = v.h * 0.66;
  const dx = Math.min(v.w * 0.2, w * 0.62);
  return [
    { cx: cx - dx, cy, w, h, side: -1 },
    { cx: cx + dx, cy, w, h, side: 1 },
  ];
}

const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));

function Eye({ slot, p, gaze, blink, id, pupils, fill, dots }: {
  slot: Slot; p: EyeP; gaze: { x: number; y: number }; blink: number; id: string; pupils: boolean; fill: string; dots: string;
}) {
  const { cx, cy } = slot;
  const W = slot.w * p.sx;
  const H = slot.h * p.sy;
  const x0 = cx - W / 2;
  const y0 = cy - H / 2;
  const r = Math.min(W, H) * p.rx;
  const topY = y0 + p.top * H;
  const pr = Math.min(W, H) * 0.21 * p.ps;
  const gx = clamp(p.px + gaze.x, -1, 1);
  const gy = clamp(p.py + gaze.y, -1, 1);
  const pcx = cx + gx * (W / 2 - pr * 1.05);
  const pcy = cy + gy * (H / 2 - pr * 1.05);
  // Eye shifts slightly with gaze, too, so the whole face feels alive.
  const ox = gaze.x * slot.w * 0.06;
  const oy = gaze.y * slot.h * 0.05;
  const sy = 1 - blink * 0.94;

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

const ROBOT = [
  '.....#.....',
  '....###....',
  '..#######..',
  '..#.....#..',
  '..#.#.#.#..',
  '..#.....#..',
  '..#######..',
  '....#.#....',
  '..#######..',
  '.#.......#.',
  '#.........#',
];

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
  const ss = slots(v, optics);
  const cx = v.x + v.w / 2;
  const cy = v.y + v.h / 2;
  const unit = v.h / 100;
  const blur = (1.5 + charge * 4.5) * unit;
  const lit = shade(glow, 0.28);

  let content: ReactNode = null;
  if (mode === 'eyes') {
    content = ss.map((s, i) => (
      <Eye key={i} slot={s} p={ss.length === 1 ? L : i === 0 ? L : R} gaze={gaze} blink={blink} id={`${uid}-m${i}`} pupils={pupils} fill={fill} dots={dots} />
    ));
  } else if (mode === 'glyph') {
    const n = ROBOT.length;
    const cell = (v.h * 0.78) / n;
    const ox = cx - (cell * n) / 2;
    const oy = cy - (cell * n) / 2;
    content = ROBOT.flatMap((row, y) =>
      row.split('').map((ch, x) =>
        ch === '#' ? <rect key={`${x}-${y}`} x={ox + x * cell + cell * 0.1} y={oy + y * cell + cell * 0.1} width={cell * 0.8} height={cell * 0.8} rx={cell * 0.2} fill={`url(#${fill})`} /> : null,
      ),
    );
  } else if (mode === 'wave') {
    const n = 9;
    const bw = v.w * 0.035;
    const gap = bw * 0.9;
    const total = n * bw + (n - 1) * gap;
    content = Array.from({ length: n }, (_, i) => {
      const h = v.h * (0.22 + 0.5 * Math.sin(((i + 1) / (n + 1)) * Math.PI));
      return (
        <rect key={i} className="cog-wave" style={{ animationDelay: `${-i * 0.13}s`, animationDuration: `${0.7 + (i % 3) * 0.18}s` }}
          x={cx - total / 2 + i * (bw + gap)} y={cy - h / 2} width={bw} height={h} rx={bw / 2} fill={`url(#${fill})`} />
      );
    });
  } else if (mode === 'dots') {
    const r = v.h * 0.085;
    content = [-1, 0, 1].map((k) => (
      <circle key={k} className="cog-dot" style={{ animationDelay: `${(k + 1) * 0.16}s` }} cx={cx + k * r * 3.2} cy={cy} r={r} fill={`url(#${fill})`} />
    ));
  } else if (mode === 'think') {
    // A ring of LEDs with a light chasing round it, a breathing core and three counter-orbiting satellites.
    const R = v.h * 0.3;
    const n = 12;
    const dur = 1.2;
    content = (
      <g>
        {Array.from({ length: n }, (_, i) => {
          const a = (i / n) * Math.PI * 2 - Math.PI / 2;
          return (
            <circle key={i} cx={cx + R * Math.cos(a)} cy={cy + R * Math.sin(a)} r={v.h * 0.045} fill={lit} opacity={0.15}>
              <animate attributeName="opacity" values="1;0.15;0.15" keyTimes="0;0.6;1" dur={`${dur}s`} begin={`${(i / n) * dur - dur}s`} repeatCount="indefinite" />
            </circle>
          );
        })}
        <circle cx={cx} cy={cy} r={v.h * 0.09} fill={`url(#${fill})`}>
          <animate attributeName="r" values={`${v.h * 0.07};${v.h * 0.115};${v.h * 0.07}`} dur="1.6s" repeatCount="indefinite" />
        </circle>
        <g>
          <animateTransform attributeName="transform" type="rotate" from={`360 ${cx} ${cy}`} to={`0 ${cx} ${cy}`} dur="3.6s" repeatCount="indefinite" />
          {[0, 1, 2].map((k) => {
            const a = (k / 3) * Math.PI * 2;
            return <circle key={k} cx={cx + R * 0.58 * Math.cos(a)} cy={cy + R * 0.58 * Math.sin(a)} r={v.h * 0.028} fill={lit} opacity={0.75} />;
          })}
        </g>
      </g>
    );
  } else if (mode === 'search') {
    // Radar: a sweeping beam with a fading wake; blips flare as the beam passes them.
    const R = v.h * 0.38;
    const dur = 2.4;
    const wake = (-55 * Math.PI) / 180;
    const sw = unit * 1.3;
    const blips: [number, number][] = [[38, 0.72], [150, 0.45], [255, 0.82], [312, 0.32]];
    content = (
      <g>
        <circle cx={cx} cy={cy} r={R} fill="none" stroke={lit} strokeOpacity={0.6} strokeWidth={sw * 1.2} />
        <circle cx={cx} cy={cy} r={R * 0.55} fill="none" stroke={lit} strokeOpacity={0.4} strokeWidth={sw} />
        <line x1={cx - R} x2={cx + R} y1={cy} y2={cy} stroke={lit} strokeOpacity={0.28} strokeWidth={sw} />
        <line x1={cx} x2={cx} y1={cy - R} y2={cy + R} stroke={lit} strokeOpacity={0.28} strokeWidth={sw} />
        <g>
          <animateTransform attributeName="transform" type="rotate" from={`0 ${cx} ${cy}`} to={`360 ${cx} ${cy}`} dur={`${dur}s`} repeatCount="indefinite" />
          <path d={`M${cx} ${cy} L${cx + R} ${cy} A${R} ${R} 0 0 0 ${cx + R * Math.cos(wake)} ${cy + R * Math.sin(wake)} Z`} fill={lit} opacity={0.38} />
          <line x1={cx} y1={cy} x2={cx + R} y2={cy} stroke="#fff" strokeWidth={sw * 1.4} strokeLinecap="round" />
        </g>
        {blips.map(([deg, d]) => {
          const a = (deg * Math.PI) / 180;
          return (
            <circle key={deg} cx={cx + R * d * Math.cos(a)} cy={cy + R * d * Math.sin(a)} r={unit * 4.2} fill={`url(#${fill})`} opacity={0.08}>
              <animate attributeName="opacity" values="1;0.08" dur={`${dur}s`} begin={`${(deg / 360) * dur}s`} repeatCount="indefinite" />
            </circle>
          );
        })}
        <circle cx={cx} cy={cy} r={unit * 2.4} fill="#fff" />
      </g>
    );
  } else if (mode === 'code') {
    // A terminal: dot-matrix code scrolls up, a prompt waits at the bottom with a blinking block cursor.
    const rows = [[0, 0.22, 0.4], [0.1, 0.3], [0.1, 0.16, 0.24, 0.12], [0.2, 0.36], [0.1, 0.2], [0, 0.08]];
    const rowH = v.h * 0.13;
    const tw = Math.min(v.w * 0.72, v.h * 1.4);
    const x0 = cx - tw / 2;
    const block = rows.length * rowH;
    const top = v.y + v.h * 0.14;
    const bh = rowH * 0.42;
    const clip = `${uid}-cc`;
    const promptY = v.y + v.h * 0.8;
    content = (
      <g>
        <defs>
          <clipPath id={clip}>
            <rect x={v.x} y={v.y} width={v.w} height={v.h * 0.66} />
          </clipPath>
        </defs>
        <g clipPath={`url(#${clip})`}>
          <g>
            <animateTransform attributeName="transform" type="translate" from="0 0" to={`0 ${-block}`} dur={`${rows.length * 0.6}s`} repeatCount="indefinite" />
            {[-1, 0, 1, 2].flatMap((copy) =>
              rows.map((r, i) => {
                const y = top + (copy * rows.length + i) * rowH;
                let x = x0 + r[0] * tw;
                return r.slice(1).map((w, j) => {
                  const el = <rect key={`${copy}-${i}-${j}`} x={x} y={y} width={w * tw} height={bh} rx={bh / 2} fill={j === 0 ? '#fff' : lit} opacity={j === 0 ? 0.95 : 0.7} />;
                  x += w * tw + bh * 0.9;
                  return el;
                });
              }),
            )}
          </g>
        </g>
        <polyline points={`${x0},${promptY - bh * 0.7} ${x0 + bh * 0.8},${promptY} ${x0},${promptY + bh * 0.7}`} fill="none" stroke={lit} strokeWidth={unit * 2.4} strokeLinecap="round" strokeLinejoin="round" />
        <rect x={x0 + bh * 2} y={promptY - rowH * 0.36} width={rowH * 0.42} height={rowH * 0.72} rx={unit} fill="#fff">
          <animate attributeName="opacity" values="1;0" dur="1s" calcMode="discrete" repeatCount="indefinite" />
        </rect>
      </g>
    );
  } else {
    // Working: a train of solid LED gears meshing and turning, sized to fit any visor.
    const train = meshChain(1, { z: 12, cx: 0, cy: 0 }, [{ z: 8, deg: -32 }, { z: 10, deg: 48 }]);
    const ext = train.map((g) => ({ x0: g.cx - g.z / 2 - 1, x1: g.cx + g.z / 2 + 1, y0: g.cy - g.z / 2 - 1, y1: g.cy + g.z / 2 + 1 }));
    const bx0 = Math.min(...ext.map((e) => e.x0));
    const bx1 = Math.max(...ext.map((e) => e.x1));
    const by0 = Math.min(...ext.map((e) => e.y0));
    const by1 = Math.max(...ext.map((e) => e.y1));
    const m = Math.min((v.w * 0.84) / (bx1 - bx0), (v.h * 0.84) / (by1 - by0));
    const ox = cx - ((bx0 + bx1) / 2) * m;
    const oy = cy - ((by0 + by1) / 2) * m;
    content = (
      <g>
        {train.map((g, i) => {
          const gx = ox + g.cx * m;
          const gy = oy + g.cy * m;
          const pitch = (m * g.z) / 2;
          const body = roundedPoly(gearPoints(gx, gy, g.z, pitch - m * 1.2, pitch + m, g.phase), m * 0.25);
          const holes = g.z >= 10 ? 4 : 0;
          return (
            <g key={i}>
              <animateTransform attributeName="transform" type="rotate" from={`0 ${gx} ${gy}`} to={`${360 * g.dir} ${gx} ${gy}`} dur={`${g.z * 0.32}s`} repeatCount="indefinite" />
              <path d={body} fill={`url(#${fill})`} />
              <path d={body} fill={`url(#${dots})`} />
              {Array.from({ length: holes }, (_, k) => {
                const a = g.phase + (k / holes) * Math.PI * 2 + Math.PI / holes;
                return <circle key={k} cx={gx + Math.cos(a) * pitch * 0.55} cy={gy + Math.sin(a) * pitch * 0.55} r={pitch * 0.15} fill="#04070a" />;
              })}
              <circle cx={gx} cy={gy} r={pitch * 0.24} fill="#04070a" />
              <circle cx={gx} cy={gy} r={pitch * 0.09} fill={lit} />
            </g>
          );
        })}
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
