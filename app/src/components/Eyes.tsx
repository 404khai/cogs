import type { ReactNode } from 'react';
import type { Rect, Optics } from '../lib/chassis';
import type { EyeP } from '../lib/expressions';
import type { ScreenMode } from '../lib/config';
import { shade } from '../lib/color';

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
  } else {
    const r = v.h * 0.085;
    content = [-1, 0, 1].map((k) => (
      <circle key={k} className="cog-dot" style={{ animationDelay: `${(k + 1) * 0.16}s` }} cx={cx + k * r * 3.2} cy={cy} r={r} fill={`url(#${fill})`} />
    ));
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
