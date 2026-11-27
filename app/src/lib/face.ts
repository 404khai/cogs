/**
 * Renderer-agnostic face logic shared by every cog renderer (the web SVG and the React Native SDK):
 * where the eyes sit in the visor, how the visor recess wraps the status light, and the animation
 * state behind gaze, blinks and expression tweens. Pure: no DOM, no timers.
 */
import type { Chassis, Optics, Rect } from './chassis';
import { EYE_KEYS } from './expressions';
import type { EyeP, Expression } from './expressions';

export type Slot = { cx: number; cy: number; w: number; h: number; side: number };

/** Eye slots inside a visor: one centred eye for mono optics, a pair for dual. */
export function eyeSlots(v: Rect, optics: Optics): Slot[] {
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

/** Rim width around the visor. */
export const RECESS_PAD = 11;

/** Light sits directly above the visor → cut it into a notch of the visor recess (as on the reference bots). */
export function lightNotch(ch: Chassis): { tab: Rect | null; recessTop: number } {
  const v = ch.visor;
  const li = ch.light;
  const lpad = 7;
  const tab =
    !li.angle && li.w > li.h && li.x >= v.x && li.x + li.w <= v.x + v.w && v.y - RECESS_PAD - (li.y + li.h) < 30
      ? { x: li.x - lpad, y: li.y - lpad, w: li.w + lpad * 2, h: v.y - (li.y - lpad), r: li.h / 2 + lpad }
      : null;
  return { tab, recessTop: tab ? tab.y : v.y - RECESS_PAD };
}

export type Gaze = { x: number; y: number };
export type FaceFrame = { L: EyeP; R: EyeP; gaze: Gaze; blink: number };

/** Mutable animation state for one face. Advance it with stepFace once per frame. */
export type Face = FaceFrame & { gazeT: Gaze; blinkStart: number; nextBlink: number; nextSacc: number };

const rand = (a: number, b: number) => a + Math.random() * (b - a);

export function createFace(expr: Expression, now: number): Face {
  return {
    L: { ...expr.L },
    R: { ...expr.R },
    gaze: { x: 0, y: 0 },
    gazeT: { x: 0, y: 0 },
    blink: 0,
    blinkStart: -1,
    nextBlink: now + rand(800, 3000),
    nextSacc: 0,
  };
}

export type FaceInput = {
  expr: Expression;
  curiosity: number;
  blink: number;
  /** Where to look, -1..1 on each axis (already scaled by curiosity). Null lets the eyes wander. */
  look?: Gaze | null;
  /** Reduced motion: snap to the expression, no saccades, no blinks. */
  still?: boolean;
};

/** Advance a face to time t (ms). Returns true when it moved enough to be worth a redraw. */
export function stepFace(s: Face, t: number, { expr, curiosity, blink, look, still = false }: FaceInput): boolean {
  let moved = 0;

  // Tween eye parameters toward the target expression.
  for (const side of ['L', 'R'] as const) {
    for (const k of EYE_KEYS) {
      const d = expr[side][k] - s[side][k];
      s[side][k] += d * (still ? 1 : 0.2);
      moved = Math.max(moved, Math.abs(d));
    }
  }

  // Gaze: follow the target while there is one, otherwise wander.
  if (look) {
    s.gazeT = look;
  } else if (t > s.nextSacc && !still) {
    const a = rand(0, Math.PI * 2);
    const m = rand(0, 0.7) * curiosity;
    s.gazeT = Math.random() < 0.35 ? { x: 0, y: 0 } : { x: Math.cos(a) * m, y: Math.sin(a) * m * 0.7 };
    s.nextSacc = t + rand(900, 3200);
  }
  const gx = s.gaze.x + (s.gazeT.x - s.gaze.x) * 0.16;
  const gy = s.gaze.y + (s.gazeT.y - s.gaze.y) * 0.16;
  moved = Math.max(moved, Math.abs(gx - s.gaze.x), Math.abs(gy - s.gaze.y));
  s.gaze = { x: gx, y: gy };

  // Blink.
  if (blink > 0.02 && t > s.nextBlink && !still) {
    s.blinkStart = t;
    const double = Math.random() < 0.18;
    s.nextBlink = t + (double ? 260 : rand(1400, 5200) / (0.3 + blink * 1.6));
  }
  const bt = t - s.blinkStart;
  const b = s.blinkStart >= 0 && bt < 180 ? Math.sin((Math.PI * bt) / 180) : 0;
  if (b !== s.blink) moved = Math.max(moved, 0.01);
  s.blink = b;

  return moved > 0.0008;
}

/** A snapshot of a face for rendering. */
export const faceFrame = (s: Face): FaceFrame => ({ L: { ...s.L }, R: { ...s.R }, gaze: { ...s.gaze }, blink: s.blink });
