/**
 * The web renderer animates its displays with SVG SMIL and CSS keyframes; react-native-svg has neither.
 * These are the same animations as plain functions of time t (seconds), so a display is just a render at t.
 */

const frac = (x: number) => x - Math.floor(x);
/** Close to CSS ease-in-out. */
const ease = (f: number) => 0.5 - 0.5 * Math.cos(Math.PI * f);

/** Degrees turned by something spinning once every dur seconds. */
export const spin = (t: number, dur: number) => 360 * frac(t / dur);

/** 0 → 1 → 0 once every dur seconds (SMIL values="a;b;a"). */
export const triangle = (t: number, dur: number) => 1 - Math.abs(2 * frac(t / dur) - 1);

/** Voice bars: `wave` keyframes, scaleY 0.25 → 1, ease-in-out, alternate. */
export function waveScale(t: number, delay: number, dur: number) {
  const p = (t - delay) / dur;
  const k = Math.floor(p);
  const f = Math.abs(k % 2) === 1 ? 1 - (p - k) : p - k;
  return 0.25 + 0.75 * ease(f);
}

/** Typing dots: `dot` keyframes. Rest at 0% and 60–100%, hop to -hop and full brightness at 30%. */
export function dotHop(t: number, delay: number, dur: number, hop: number) {
  if (t < delay) return { dy: 0, opacity: 0.55 };
  const f = frac((t - delay) / dur);
  if (f >= 0.6) return { dy: 0, opacity: 0.55 };
  const g = f < 0.3 ? ease(f / 0.3) : 1 - ease((f - 0.3) / 0.3);
  return { dy: -hop * g, opacity: 0.55 + 0.45 * g };
}

/** Thinking ring LED: values="1;0.15;0.15" keyTimes="0;0.6;1" from its begin offset. */
export function chase(t: number, begin: number, dur: number) {
  const f = frac((t - begin) / dur);
  return f < 0.6 ? 1 - 0.85 * (f / 0.6) : 0.15;
}

/** Radar blip: values="1;0.08", starting at begin; dim until then. */
export const blip = (t: number, begin: number, dur: number) => (t < begin ? 0.08 : 1 - 0.92 * frac((t - begin) / dur));

/** Terminal cursor: on for the first half of each second. */
export const cursorOn = (t: number) => (frac(t) < 0.5 ? 1 : 0);

/** Scroll offset of the terminal's code, 0 → by every dur seconds. */
export const scroll = (t: number, by: number, dur: number) => by * frac(t / dur);
