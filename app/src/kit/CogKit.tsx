import { useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Cog } from '../components/Cog';
import { DEFAULT } from '../lib/config';
import type { CogConfig, ScreenMode } from '../lib/config';
import { reducedMotion } from '../lib/pointer';
import { gearPoints, roundedPoly } from '../lib/chassis';
import { meshChain } from '../lib/gears';

/*
 * Cog components: drop-in pieces for apps that put a Cogs unit in front of users.
 * Every component takes `unit` (any CogConfig, e.g. from the studio's JSON) and drives
 * the bot's screen and expression from its own state.
 */

export type VoiceState = 'idle' | 'listening' | 'speaking' | 'processing';
export type Emotion = 'neutral' | 'positive' | 'calm' | 'negative';
export const EMOTION: Record<Emotion, string> = { neutral: '#46d6ff', positive: '#19c27a', calm: '#3fd0c9', negative: '#ff5a3c' };

const unitFor = (u: Partial<CogConfig> | undefined) => ({ ...DEFAULT, ...u });
const TAU = Math.PI * 2;

/** What the bot shows for each voice state. */
function face(state: VoiceState): { screen: ScreenMode; expression?: string } {
  if (state === 'speaking') return { screen: 'wave' };
  if (state === 'processing') return { screen: 'think' };
  if (state === 'listening') return { screen: 'eyes', expression: 'surprised' };
  return { screen: 'eyes' };
}

/** A smoothed 0–1 level: from `ext` when given, otherwise a convincing simulated voice. */
function useLevel(state: VoiceState, ext?: number) {
  const [lv, setLv] = useState(0);
  const live = useRef({ state, ext });
  live.current = { state, ext };
  useEffect(() => {
    const s = { lv: 0, target: 0, next: 0 };
    let raf = 0;
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      const { state: st, ext: e } = live.current;
      let target = 0;
      if (st === 'listening' || st === 'speaking') {
        if (e !== undefined) target = e;
        else if (st === 'listening') {
          if (t > s.next) {
            s.target = Math.random() < 0.22 ? 0.03 : 0.2 + Math.random() * 0.8;
            s.next = t + 70 + Math.random() * 190;
          }
          target = s.target;
        } else target = (Math.sin(t / 130) * 0.5 + 0.5) * (Math.sin(t / 43) * 0.35 + 0.65) * (0.5 + 0.5 * Math.sin(t / 760));
      }
      s.lv += (target - s.lv) * (target > s.lv ? 0.4 : 0.12);
      setLv(s.lv);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return lv;
}

/** Microphone RMS level (0–1) while `on`. `level` stays null until permission is granted. */
export function useMicrophone(on: boolean) {
  const [level, setLevel] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!on) {
      setLevel(null);
      return;
    }
    let stop = false;
    let raf = 0;
    let stream: MediaStream | null = null;
    let ctx: AudioContext | null = null;
    navigator.mediaDevices
      ?.getUserMedia({ audio: true })
      .then((s) => {
        if (stop) return s.getTracks().forEach((t) => t.stop());
        stream = s;
        ctx = new AudioContext();
        const an = ctx.createAnalyser();
        an.fftSize = 1024;
        ctx.createMediaStreamSource(s).connect(an);
        const buf = new Uint8Array(an.fftSize);
        const tick = () => {
          an.getByteTimeDomainData(buf);
          let sum = 0;
          for (const v of buf) sum += ((v - 128) / 128) ** 2;
          setLevel(Math.min(1, Math.sqrt(sum / buf.length) * 4.5));
          raf = requestAnimationFrame(tick);
        };
        tick();
        setError(null);
      })
      .catch(() => setError('Microphone blocked: using a simulated voice'));
    return () => {
      stop = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      ctx?.close();
    };
  }, [on]);
  return { level, error };
}

/* ── CogRing ───────────────────────────────────────────────────────────────
 * The unit sits in a machined bearing race. Ball bearings roll round it, and a crown of gear
 * teeth extends with the voice: a spectrum shaped like an internal gear. Processing turns the
 * crown into a loader with a bright sweep. Emotion tints the teeth.
 */
export function CogRing({ unit, state, level, emotion = 'neutral', size = 320 }: {
  unit?: Partial<CogConfig>; state: VoiceState; level?: number; emotion?: Emotion; size?: number;
}) {
  const uid = 'r' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const N = 56;
  const lv = useLevel(state, level);
  const [f, setF] = useState({ bands: new Array<number>(N).fill(0), rot: 0, sweep: 0 });
  const live = useRef({ state, lv });
  live.current = { state, lv };

  useEffect(() => {
    const s = { bands: new Array<number>(N).fill(0), rot: 0, sweep: 0 };
    let raf = 0;
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      const { state: st, lv: l } = live.current;
      const m = reducedMotion ? 0 : 1;
      s.rot += m * (st === 'processing' ? 0.6 : st === 'speaking' ? 0.35 : st === 'listening' ? 0.18 : 0.05);
      s.sweep = (s.sweep + m * (st === 'processing' ? 5 : 0)) % 360;
      for (let i = 0; i < N; i++) {
        // mirror left/right so the crown reads like a voice print
        const k = Math.min(i, N - i);
        const n = 0.5 + 0.5 * Math.sin(t * 0.006 * (1 + (k % 6) * 0.35) + k * 1.9);
        const shape = 0.55 + 0.45 * Math.cos((k / N) * TAU);
        const target =
          st === 'idle' ? 0.06 + 0.04 * Math.sin(t / 900 + k) : st === 'processing' ? 0.22 : l * (0.3 + 0.7 * n) * shape;
        s.bands[i] += (target - s.bands[i]) * 0.3;
      }
      setF({ bands: [...s.bands], rot: s.rot, sweep: s.sweep });
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const c = EMOTION[emotion];
  const r0 = 116;
  const w0 = ((TAU * r0) / N) * 0.56;
  const balls = 14;
  const { screen, expression } = face(state);

  return (
    <div className={`cog-ring ${state}`} style={{ width: `min(${size}px, 100%)` }} role="img" aria-label={`${unitFor(unit).name}, ${state}`}>
      <svg viewBox="-160 -160 320 320" aria-hidden="true">
        <defs>
          <linearGradient id={`${uid}-race`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f4f5f7" />
            <stop offset="0.5" stopColor="#c3c8cf" />
            <stop offset="1" stopColor="#8b929d" />
          </linearGradient>
          <radialGradient id={`${uid}-ball`} cx="35%" cy="30%" r="70%">
            <stop offset="0" stopColor="#fff" />
            <stop offset="0.6" stopColor="#aab0b9" />
            <stop offset="1" stopColor="#5c636e" />
          </radialGradient>
          <filter id={`${uid}-glow`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2.4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* crown of teeth: the spectrum */}
        <g filter={`url(#${uid}-glow)`}>
          {f.bands.map((b, i) => {
            const a = (i / N) * 360 + f.rot;
            const r1 = r0 + 5 + b * 34;
            const w1 = w0 * 0.62;
            let op = 0.35 + b * 1.6;
            if (state === 'processing') {
              const d = (((f.sweep - a) % 360) + 360) % 360;
              op = d < 90 ? 1 - d / 90 : 0.12;
            }
            return (
              <polygon
                key={i}
                points={`${r0},${-w0 / 2} ${r1},${-w1 / 2} ${r1},${w1 / 2} ${r0},${w0 / 2}`}
                transform={`rotate(${a})`}
                fill={c}
                opacity={Math.min(1, op)}
              />
            );
          })}
        </g>

        {/* bearing race with rolling balls */}
        <circle r="104" fill="none" stroke={`url(#${uid}-race)`} strokeWidth="22" />
        <circle r="104" fill="none" stroke="#1c2128" strokeWidth="10" />
        <g transform={`rotate(${-f.rot * 1.6})`}>
          {Array.from({ length: balls }, (_, i) => {
            const a = (i / balls) * TAU;
            return <circle key={i} cx={Math.cos(a) * 104} cy={Math.sin(a) * 104} r="4.2" fill={`url(#${uid}-ball)`} />;
          })}
        </g>
        <circle r="115.5" fill="none" stroke="#fff" strokeOpacity="0.7" />
        <circle r="92.5" fill="none" stroke="#5c636e" strokeOpacity="0.5" />
        {/* index ticks on the inner face */}
        <g transform={`rotate(${f.rot * 0.5})`} opacity="0.5">
          {Array.from({ length: 36 }, (_, i) => {
            const a = (i / 36) * TAU;
            return <line key={i} x1={Math.cos(a) * 86} y1={Math.sin(a) * 86} x2={Math.cos(a) * (i % 3 ? 89 : 91)} y2={Math.sin(a) * (i % 3 ? 89 : 91)} stroke="var(--blue)" />;
          })}
        </g>
      </svg>
      <div className="cog-ring-unit">
        <Cog config={{ ...unitFor(unit), screen, glow: emotion === 'neutral' ? unitFor(unit).glow : c }} expression={expression} />
      </div>
    </div>
  );
}

/* ── LED strip: the composer's voice edge ──────────────────────────────────── */
function LedStrip({ state, level, color }: { state: VoiceState; level: number; color: string }) {
  const n = 48;
  const [t, setT] = useState(0);
  useEffect(() => {
    if (state !== 'processing') return;
    let raf = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      setT(now);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [state]);
  // processing: a scanner bounces end to end
  const head = (Math.sin(t / 380) * 0.5 + 0.5) * (n - 1);
  return (
    <div className="led-strip" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => {
        let on = 0;
        if (state === 'listening' || state === 'speaking') {
          const fromCenter = Math.abs(i - (n - 1) / 2) / ((n - 1) / 2);
          on = Math.max(0, Math.min(1, (level * 1.3 - fromCenter) * 3));
        } else if (state === 'processing') on = Math.max(0, 1 - Math.abs(i - head) / 4);
        return <i key={i} style={{ opacity: 0.12 + on * 0.88, background: on > 0.05 ? color : undefined, boxShadow: on > 0.4 ? `0 0 6px ${color}` : undefined }} />;
      })}
    </div>
  );
}

/* ── CogComposer: a machined chat console with the unit perched in a cradle ───
 * A chamfered alloy plate with screws, a recessed dark visor for the text, an LED channel that
 * listens, and push buttons. The unit sits on a raised cradle and reacts to what you do.
 */
export function CogComposer({ unit, state, level, onSend, onMic, value, onChange, placeholder, emotion = 'neutral' }: {
  unit?: Partial<CogConfig>; state: VoiceState; level?: number; emotion?: Emotion;
  value: string; onChange: (v: string) => void; onSend: () => void; onMic: () => void; placeholder?: string;
}) {
  const lv = useLevel(state, level);
  const [focus, setFocus] = useState(false);
  const u = unitFor(unit);
  const typing = focus && value.length > 0 && state === 'idle';
  const { screen, expression } = face(state);
  const color = EMOTION[emotion];
  const status = state === 'listening' ? 'Listening' : state === 'speaking' ? 'Speaking' : state === 'processing' ? 'Working' : typing ? 'Reading along' : 'Ready';
  return (
    <div className={`composer ${state} ${focus ? 'focus' : ''}`} style={{ ['--led' as string]: color }}>
      <div className="composer-unit" aria-hidden="true">
        <Cog config={{ ...u, screen, curiosity: 0.9 }} expression={typing ? 'focused' : expression} />
      </div>
      <div className="composer-shell">
        <span className="composer-cradle" aria-hidden="true" />
        <form
          className="composer-plate"
          onSubmit={(e) => {
            e.preventDefault();
            if (value.trim()) onSend();
          }}
        >
          <div className="plate-face">
            <div className="plate-top mono">
              <span>CH-01</span>
              <span>To · {u.name}</span>
            </div>
            <div className="composer-screen">
              <textarea
                value={value}
                rows={2}
                placeholder={placeholder ?? `Ask ${u.name} anything…`}
                onChange={(e) => onChange(e.target.value)}
                onFocus={() => setFocus(true)}
                onBlur={() => setFocus(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (value.trim()) onSend();
                  }
                }}
                aria-label={`Message ${u.name}`}
              />
              <span className="screen-gloss" aria-hidden="true" />
            </div>
            <LedStrip state={state} level={lv} color={color} />
            <div className="composer-row">
              <span className="nameplate mono">
                <i className="np-lamp" style={{ background: state === 'idle' ? 'var(--ok)' : color, boxShadow: `0 0 6px ${state === 'idle' ? 'var(--ok)' : color}` }} />
                {status}
              </span>
              <button type="button" className={`push mic ${state === 'listening' ? 'on' : ''}`} onClick={onMic} aria-label={state === 'listening' ? 'Stop listening' : 'Speak'} aria-pressed={state === 'listening'}>
                <svg viewBox="0 0 20 20" aria-hidden="true"><rect x="7" y="2.5" width="6" height="10" rx="3" /><path d="M4.5 9.5a5.5 5.5 0 0 0 11 0M10 15v3" /></svg>
              </button>
              <button type="submit" className="push send" disabled={!value.trim() || state === 'processing'} aria-label="Send">
                <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h11M11 5.5 15.5 10 11 14.5" /></svg>
              </button>
            </div>
            {[0, 1, 2, 3].map((k) => <span key={k} className={`screw s${k}`} aria-hidden="true" />)}
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── CogAvatar: the unit in a socket, with a presence lamp ────────────────── */
export type Presence = 'online' | 'busy' | 'away' | 'offline';
export function CogAvatar({ unit, size = 56, presence, screen }: { unit?: Partial<CogConfig>; size?: number; presence?: Presence; screen?: ScreenMode }) {
  const u = unitFor(unit);
  return (
    <span className={`cog-avatar ${presence ?? ''}`} style={{ width: size, height: size, padding: Math.round(size * 0.09) }} title={`${u.name}${presence ? ` · ${presence}` : ''}`}>
      <Cog config={{ ...u, screen: screen ?? u.screen, charge: presence === 'offline' ? 0.08 : u.charge }} expression={presence === 'away' ? 'sleepy' : undefined} />
      {presence && <i className="cog-avatar-lamp" />}
    </span>
  );
}

/* ── CogTyping: an inline "unit is working" indicator ─────────────────────── */
export function CogTyping({ unit, screen = 'dots', children }: { unit?: Partial<CogConfig>; screen?: ScreenMode; children: ReactNode }) {
  return (
    <span className="cog-typing">
      <CogAvatar unit={unit} size={30} screen={screen} />
      <span>{children}</span>
      <span className="cog-typing-dots" aria-hidden="true"><i /><i /><i /></span>
    </span>
  );
}

/* ── GearLoader: three meshed gears for anything that takes a while ──────── */
export function GearLoader({ size = 180, speed = 1, running = true }: { size?: number; speed?: number; running?: boolean }) {
  const M = 6;
  const train = meshChain(M, { z: 14, cx: 0, cy: 0 }, [{ z: 9, deg: -38 }, { z: 11, deg: 52 }]);
  const pad = M * 2;
  const xs = train.flatMap((g) => [g.cx - (M * g.z) / 2 - pad, g.cx + (M * g.z) / 2 + pad]);
  const ys = train.flatMap((g) => [g.cy - (M * g.z) / 2 - pad, g.cy + (M * g.z) / 2 + pad]);
  const vb = [Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)];
  const fills = ['var(--ink)', 'var(--volt)', '#c9cdd4'];
  return (
    <svg viewBox={vb.join(' ')} width={size} height={(size * vb[3]) / vb[2]} className={`k-gears ${running ? '' : 'paused'}`} role="img" aria-label="Loading">
      {train.map((g, i) => {
        const p = (M * g.z) / 2;
        return (
          <g
            key={i}
            className="k-gear"
            style={{ transformOrigin: `${g.cx}px ${g.cy}px`, animationDuration: `${(g.z * 0.22) / speed}s`, animationDirection: g.dir === 1 ? 'normal' : 'reverse' }}
          >
            <path d={roundedPoly(gearPoints(g.cx, g.cy, g.z, p - M * 1.2, p + M, g.phase), 1.5)} fill={fills[i]} />
            <circle cx={g.cx} cy={g.cy} r={p * 0.62} fill="none" stroke="#fff" strokeOpacity={i === 2 ? 0.6 : 0.18} strokeWidth="1.2" />
            <circle cx={g.cx} cy={g.cy} r={p * 0.22} fill="var(--paper-2)" />
          </g>
        );
      })}
    </svg>
  );
}


/* ── TinyGears: a two-gear spinner for inline "in progress" marks ─────────── */
export function TinyGears({ size = 18 }: { size?: number }) {
  const M = 2;
  const train = meshChain(M, { z: 10, cx: 0, cy: 0 }, [{ z: 7, deg: -40 }]);
  const pad = M * 1.2;
  const xs = train.flatMap((g) => [g.cx - (M * g.z) / 2 - pad, g.cx + (M * g.z) / 2 + pad]);
  const ys = train.flatMap((g) => [g.cy - (M * g.z) / 2 - pad, g.cy + (M * g.z) / 2 + pad]);
  const vb = [Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)];
  return (
    <svg viewBox={vb.join(' ')} height={size} className="tiny-gears" aria-hidden="true">
      {train.map((g, i) => {
        const p = (M * g.z) / 2;
        return (
          <g key={i} className="k-gear" style={{ transformOrigin: `${g.cx}px ${g.cy}px`, animationDuration: `${g.z * 0.12}s`, animationDirection: g.dir === 1 ? 'normal' : 'reverse' }}>
            <path d={roundedPoly(gearPoints(g.cx, g.cy, g.z, p - M * 1.2, p + M, g.phase), 0.3)} fill={i ? 'var(--volt)' : 'var(--ink)'} />
            <circle cx={g.cx} cy={g.cy} r={p * 0.3} fill="var(--paper-2)" />
          </g>
        );
      })}
    </svg>
  );
}

/* ── CogBelt: Sprocket units chained by timing belts ─────────────────────────
 * Any number of units in a zig-zag drive train, each pair linked by its own coloured belt with a
 * packet riding it. Gear bodies turn; faces stay upright. For handoffs, pipelines and syncs.
 */
export const BELT_COLORS = ['#1c2128', '#ff6a2b', '#3657d8', '#19c27a', '#e46fdc', '#efc12a'];

function beltPath(a: [number, number], b: [number, number], r: number) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const L = Math.hypot(dx, dy);
  const n = [dy / L, -dx / L]; // the "top" side when running left to right
  const p = (c: [number, number], k: number) => `${(c[0] + n[0] * r * k).toFixed(2)} ${(c[1] + n[1] * r * k).toFixed(2)}`;
  return { d: `M${p(a, 1)} L${p(b, 1)} A${r} ${r} 0 0 1 ${p(b, -1)} L${p(a, -1)} A${r} ${r} 0 0 1 ${p(a, 1)} Z`, len: 2 * L + Math.PI * 2 * r };
}

export function CogBelt({ units, belts = BELT_COLORS, speed = 1, running = true, size = 128, gap = 56, zigzag = 0.32 }: {
  units: Partial<CogConfig>[]; belts?: string[]; speed?: number; running?: boolean; size?: number; gap?: number; zigzag?: number;
}) {
  const n = units.length;
  const lift = size * zigzag;
  const W = n * size + (n - 1) * gap;
  const H = size + (n > 1 ? lift : 0);
  const r = size * 0.36; // rides just inside the sprocket tips
  const centers = units.map((_, i) => [size / 2 + i * (size + gap), size / 2 + (i % 2 ? lift : 0)] as [number, number]);
  const period = 6 / Math.max(0.05, speed);
  const beltSpeed = (Math.PI * 2 * r) / period;
  const pitch = 10;
  return (
    <div className={`cog-belt ${running ? '' : 'paused'}`} style={{ width: W, height: H, ['--spin' as string]: `${period}s` }}>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-hidden="true">
        {centers.slice(1).map((c, i) => {
          const { d, len } = beltPath(centers[i], c, r);
          const col = belts[i % belts.length];
          return (
            <g key={i}>
              <path d={d} fill="none" stroke={col} strokeWidth="11" strokeLinejoin="round" />
              <path d={d} fill="none" stroke="#000" strokeOpacity="0.35" strokeWidth="5" strokeDasharray={`${pitch / 2} ${pitch / 2}`} className="belt-teeth" style={{ animationDuration: `${pitch / beltSpeed}s` }} />
              <path d={d} fill="none" stroke="#fff" strokeOpacity="0.25" strokeWidth="1" transform="translate(0 -3)" />
              <circle r="4.5" fill="#fff" stroke={col} strokeWidth="2" className="belt-packet" style={{ ['--pc' as string]: col }}>
                {running && <animateMotion path={d} dur={`${len / beltSpeed}s`} begin={`${-i * 0.7}s`} repeatCount="indefinite" />}
              </circle>
            </g>
          );
        })}
      </svg>
      {units.map((u, i) => (
        <div key={i} className="belt-unit" style={{ left: centers[i][0] - size / 2, top: centers[i][1] - size / 2, width: size, height: size }}>
          <Cog config={{ ...unitFor(u), chassis: 'gear', screen: 'work' }} />
        </div>
      ))}
    </div>
  );
}
