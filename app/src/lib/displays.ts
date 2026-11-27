/**
 * Geometry of what a visor shows: the eyes and the agent displays, as plain numbers and path strings.
 * The web renderer (components/Eyes.tsx) and the React Native SDK both draw from these, so a cog
 * looks the same everywhere. Timings are in seconds; each renderer animates them its own way.
 */
import type { Rect } from './chassis';
import { gearPoints, roundedPoly } from './chassis';
import type { EyeP } from './expressions';
import type { Gaze, Slot } from './face';
import { meshChain } from './gears';

const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));

/** One eye, posed: its box, lid lines, pupil and the offset/squash from gaze and blinks. */
export function eyeShape(slot: Slot, p: EyeP, gaze: Gaze, blink: number) {
  const { cx, cy } = slot;
  const W = slot.w * p.sx;
  const H = slot.h * p.sy;
  const x0 = cx - W / 2;
  const y0 = cy - H / 2;
  const pr = Math.min(W, H) * 0.21 * p.ps;
  const gx = clamp(p.px + gaze.x, -1, 1);
  const gy = clamp(p.py + gaze.y, -1, 1);
  return {
    cx, cy, W, H, x0, y0,
    r: Math.min(W, H) * p.rx,
    topY: y0 + p.top * H,
    pr,
    pcx: cx + gx * (W / 2 - pr * 1.05),
    pcy: cy + gy * (H / 2 - pr * 1.05),
    // Eye shifts slightly with gaze, too, so the whole face feels alive.
    ox: gaze.x * slot.w * 0.06,
    oy: gaze.y * slot.h * 0.05,
    sy: 1 - blink * 0.94,
  };
}

/** Shared numbers for a visor: its centre and the unit everything scales by. */
export function visorFrame(v: Rect) {
  return { cx: v.x + v.w / 2, cy: v.y + v.h / 2, unit: v.h / 100 };
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

/** Glyph: lit cells of a pixel robot. */
export function glyphCells(v: Rect) {
  const { cx, cy } = visorFrame(v);
  const n = ROBOT.length;
  const cell = (v.h * 0.78) / n;
  const ox = cx - (cell * n) / 2;
  const oy = cy - (cell * n) / 2;
  return ROBOT.flatMap((row, y) =>
    row.split('').flatMap((ch, x) =>
      ch === '#' ? [{ key: `${x}-${y}`, x: ox + x * cell + cell * 0.1, y: oy + y * cell + cell * 0.1, size: cell * 0.8, r: cell * 0.2 }] : [],
    ),
  );
}

/** Voice: waveform bars. Each pulses scaleY 0.25↔1 about its centre, ease-in-out, alternating. */
export function waveBars(v: Rect) {
  const { cx, cy } = visorFrame(v);
  const n = 9;
  const bw = v.w * 0.035;
  const gap = bw * 0.9;
  const total = n * bw + (n - 1) * gap;
  return Array.from({ length: n }, (_, i) => {
    const h = v.h * (0.22 + 0.5 * Math.sin(((i + 1) / (n + 1)) * Math.PI));
    return { x: cx - total / 2 + i * (bw + gap), y: cy - h / 2, w: bw, h, r: bw / 2, cy, delay: -i * 0.13, dur: 0.7 + (i % 3) * 0.18 };
  });
}

/** Typing: three dots that hop 9 units and brighten in turn over 1.1s. */
export function typingDots(v: Rect) {
  const { cx, cy } = visorFrame(v);
  const r = v.h * 0.085;
  return [-1, 0, 1].map((k) => ({ k, cx: cx + k * r * 3.2, cy, r, delay: (k + 1) * 0.16 }));
}
export const TYPING = { dur: 1.1, hop: 9 };

/** Thinking: a ring of LEDs with a light chasing round it, a breathing core and three counter-orbiting satellites. */
export function thinkLayout(v: Rect) {
  const { cx, cy } = visorFrame(v);
  const R = v.h * 0.3;
  const n = 12;
  const dur = 1.2;
  return {
    cx, cy, dur,
    leds: Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      return { cx: cx + R * Math.cos(a), cy: cy + R * Math.sin(a), r: v.h * 0.045, begin: (i / n) * dur - dur };
    }),
    core: { r: v.h * 0.09, from: v.h * 0.07, to: v.h * 0.115, dur: 1.6 },
    orbit: { dur: 3.6 },
    sats: [0, 1, 2].map((k) => {
      const a = (k / 3) * Math.PI * 2;
      return { k, cx: cx + R * 0.58 * Math.cos(a), cy: cy + R * 0.58 * Math.sin(a), r: v.h * 0.028 };
    }),
  };
}

/** Search: a radar sweep with a fading wake; blips flare as the beam passes them. */
export function radarLayout(v: Rect) {
  const { cx, cy, unit } = visorFrame(v);
  const R = v.h * 0.38;
  const dur = 2.4;
  const wake = (-55 * Math.PI) / 180;
  const blips: [number, number][] = [[38, 0.72], [150, 0.45], [255, 0.82], [312, 0.32]];
  return {
    cx, cy, R, dur, unit,
    sw: unit * 1.3,
    beam: `M${cx} ${cy} L${cx + R} ${cy} A${R} ${R} 0 0 0 ${cx + R * Math.cos(wake)} ${cy + R * Math.sin(wake)} Z`,
    blips: blips.map(([deg, d]) => {
      const a = (deg * Math.PI) / 180;
      return { deg, cx: cx + R * d * Math.cos(a), cy: cy + R * d * Math.sin(a), r: unit * 4.2, begin: (deg / 360) * dur };
    }),
  };
}

/** Coding: a terminal. Code scrolls up (four copies of the block, so it loops) above a prompt and a blinking cursor. */
export function terminalLayout(v: Rect) {
  const { cx, unit } = visorFrame(v);
  const rows = [[0, 0.22, 0.4], [0.1, 0.3], [0.1, 0.16, 0.24, 0.12], [0.2, 0.36], [0.1, 0.2], [0, 0.08]];
  const rowH = v.h * 0.13;
  const tw = Math.min(v.w * 0.72, v.h * 1.4);
  const x0 = cx - tw / 2;
  const top = v.y + v.h * 0.14;
  const bh = rowH * 0.42;
  const promptY = v.y + v.h * 0.8;
  const tokens = [-1, 0, 1, 2].flatMap((copy) =>
    rows.flatMap((r, i) => {
      const y = top + (copy * rows.length + i) * rowH;
      let x = x0 + r[0] * tw;
      return r.slice(1).map((w, j) => {
        const t = { key: `${copy}-${i}-${j}`, x, y, w: w * tw, h: bh, r: bh / 2, head: j === 0 };
        x += w * tw + bh * 0.9;
        return t;
      });
    }),
  );
  return {
    unit, bh, rowH, tokens,
    clip: { x: v.x, y: v.y, w: v.w, h: v.h * 0.66 },
    scroll: { by: rows.length * rowH, dur: rows.length * 0.6 },
    prompt: `${x0},${promptY - bh * 0.7} ${x0 + bh * 0.8},${promptY} ${x0},${promptY + bh * 0.7}`,
    cursor: { x: x0 + bh * 2, y: promptY - rowH * 0.36, w: rowH * 0.42, h: rowH * 0.72, r: unit },
  };
}

/** Working: a train of solid LED gears meshing and turning, sized to fit any visor. */
export function gearTrain(v: Rect) {
  const { cx, cy } = visorFrame(v);
  const train = meshChain(1, { z: 12, cx: 0, cy: 0 }, [{ z: 8, deg: -32 }, { z: 10, deg: 48 }]);
  const ext = train.map((g) => ({ x0: g.cx - g.z / 2 - 1, x1: g.cx + g.z / 2 + 1, y0: g.cy - g.z / 2 - 1, y1: g.cy + g.z / 2 + 1 }));
  const bx0 = Math.min(...ext.map((e) => e.x0));
  const bx1 = Math.max(...ext.map((e) => e.x1));
  const by0 = Math.min(...ext.map((e) => e.y0));
  const by1 = Math.max(...ext.map((e) => e.y1));
  const m = Math.min((v.w * 0.84) / (bx1 - bx0), (v.h * 0.84) / (by1 - by0));
  const ox = cx - ((bx0 + bx1) / 2) * m;
  const oy = cy - ((by0 + by1) / 2) * m;
  return train.map((g) => {
    const gx = ox + g.cx * m;
    const gy = oy + g.cy * m;
    const pitch = (m * g.z) / 2;
    const holes = g.z >= 10 ? 4 : 0;
    return {
      gx, gy, pitch,
      dir: g.dir,
      dur: g.z * 0.32,
      body: roundedPoly(gearPoints(gx, gy, g.z, pitch - m * 1.2, pitch + m, g.phase), m * 0.25),
      holes: Array.from({ length: holes }, (_, k) => {
        const a = g.phase + (k / holes) * Math.PI * 2 + Math.PI / holes;
        return { cx: gx + Math.cos(a) * pitch * 0.55, cy: gy + Math.sin(a) * pitch * 0.55, r: pitch * 0.15 };
      }),
    };
  });
}
