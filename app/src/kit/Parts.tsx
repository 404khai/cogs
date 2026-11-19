import { useEffect, useId, useRef, useState } from 'react';
import { gearPoints, roundedPoly } from '../lib/chassis';
import { meshChain } from '../lib/gears';
import { reducedMotion } from '../lib/pointer';

const uidOf = (s: string) => 'k' + s.replace(/[^a-zA-Z0-9]/g, '');
const TAU = Math.PI * 2;

/* ── K-01 Aperture: a camera iris that opens with the voice level ─────────── */
export type ApertureState = 'idle' | 'listening' | 'speaking' | 'muted';

/**
 * Seven steel blades close over a lens. Listening, they breathe open with the input level and
 * the VU ring lights up; speaking, they pulse with the output; muted, they shut and the ring goes red.
 * Pass `level` (0–1) to drive it from real audio, or leave it out for a simulated signal.
 */
export function Aperture({ state, level, size = 280 }: { state: ApertureState; level?: number; size?: number }) {
  const uid = uidOf(useId());
  const [f, setF] = useState({ lv: 0, o: 0.18, spin: 0 });
  const live = useRef({ state, level });
  live.current = { state, level };

  useEffect(() => {
    const s = { lv: 0, o: 0.18, spin: 0, target: 0, next: 0 };
    let raf = 0;
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      const { state: st, level: ext } = live.current;
      let target = 0;
      if (ext !== undefined) target = ext;
      else if (st === 'listening') {
        if (t > s.next) {
          s.target = Math.random() < 0.25 ? 0.04 : 0.25 + Math.random() * 0.75;
          s.next = t + 70 + Math.random() * 200;
        }
        target = s.target;
      } else if (st === 'speaking') {
        target = Math.max(0, (Math.sin(t / 140) * 0.5 + 0.5) * (Math.sin(t / 47) * 0.35 + 0.65) * (0.55 + 0.45 * Math.sin(t / 820)));
      }
      if (st === 'muted' || st === 'idle') target = 0;
      s.lv += (target - s.lv) * (target > s.lv ? 0.35 : 0.12);
      const open =
        st === 'muted' ? 0.02 : st === 'idle' ? 0.2 + 0.04 * Math.sin(t / 700) : st === 'listening' ? 0.32 + s.lv * 0.55 : 0.26 + s.lv * 0.62;
      s.o += (open - s.o) * (reducedMotion ? 1 : 0.14);
      s.spin = st === 'speaking' ? s.spin + 0.25 : s.spin;
      setF({ lv: s.lv, o: s.o, spin: s.spin });
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const N = 7;
  const R = 88;
  const ro = f.o * 84;
  const twist = f.o * 1.15;
  const ticks = 60;
  const lit = Math.round(f.lv * ticks);
  const red = state === 'muted';
  const glow = red ? '#ff4d2e' : '#46d6ff';

  return (
    <svg viewBox="-130 -130 260 260" width={size} height={size} className="k-aperture" role="img" aria-label={`Aperture, ${state}`}>
      <defs>
        <linearGradient id={`${uid}-bez`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f4f5f7" />
          <stop offset="0.5" stopColor="#c9cdd4" />
          <stop offset="1" stopColor="#9097a2" />
        </linearGradient>
        <linearGradient id={`${uid}-blade`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#3a414c" />
          <stop offset="0.55" stopColor="#5d6672" />
          <stop offset="1" stopColor="#2a3038" />
        </linearGradient>
        <radialGradient id={`${uid}-lens`} cx="45%" cy="40%" r="70%">
          <stop offset="0" stopColor="#0f2b3a" />
          <stop offset="1" stopColor="#03070b" />
        </radialGradient>
        <radialGradient id={`${uid}-core`}>
          <stop offset="0" stopColor="#fff" />
          <stop offset="0.35" stopColor={glow} />
          <stop offset="1" stopColor={glow} stopOpacity="0" />
        </radialGradient>
        <filter id={`${uid}-glow`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <clipPath id={`${uid}-iris`}>
          <circle r={R} />
        </clipPath>
      </defs>

      <circle r="126" fill={`url(#${uid}-bez)`} />
      <circle r="126" fill="none" stroke="#fff" strokeOpacity="0.8" strokeWidth="1.5" transform="translate(0 1)" />
      <circle r="114" fill="#1c2128" />

      {/* VU ring */}
      <g filter={`url(#${uid}-glow)`}>
        {Array.from({ length: ticks }, (_, i) => {
          const a = (i / ticks) * TAU - Math.PI / 2;
          const on = i < lit;
          const major = i % 5 === 0;
          return (
            <line
              key={i}
              x1={Math.cos(a) * 100} y1={Math.sin(a) * 100}
              x2={Math.cos(a) * (major ? 111 : 108)} y2={Math.sin(a) * (major ? 111 : 108)}
              stroke={on ? (i > ticks * 0.85 ? '#ff6a2b' : glow) : red ? '#5a2620' : '#3a434f'}
              strokeWidth={major ? 2.4 : 1.6}
              strokeLinecap="round"
            />
          );
        })}
      </g>

      {[45, 135, 225, 315].map((d) => (
        <g key={d} transform={`rotate(${d}) translate(119 0)`}>
          <circle r="4" fill="#7c838e" />
          <line x1="-2.6" x2="2.6" stroke="#2a3038" strokeWidth="1.2" transform="rotate(30)" />
        </g>
      ))}

      {/* lens + core */}
      <circle r={R + 4} fill="#0b0f14" />
      <circle r={R} fill={`url(#${uid}-lens)`} />
      <circle r={14 + f.lv * 34} fill={`url(#${uid}-core)`} opacity={red ? 0.25 : 0.55 + f.lv * 0.45} />
      <circle r="5" fill="#fff" opacity={red ? 0.3 : 0.9} />

      {/* iris blades: each is the half-plane outside one side of a twisting regular heptagon */}
      <g clipPath={`url(#${uid}-iris)`} transform={`rotate(${f.spin})`}>
        {Array.from({ length: N }, (_, i) => {
          const a = (i / N) * TAU + twist;
          const n = [Math.cos(a), Math.sin(a)];
          const d = [-Math.sin(a), Math.cos(a)];
          const T = [n[0] * ro, n[1] * ro];
          const L = 260;
          const pts = [
            [T[0] - d[0] * L, T[1] - d[1] * L],
            [T[0] + d[0] * 40, T[1] + d[1] * 40],
            [T[0] + d[0] * 40 + n[0] * L, T[1] + d[1] * 40 + n[1] * L],
            [T[0] - d[0] * L + n[0] * L, T[1] - d[1] * L + n[1] * L],
          ];
          return (
            <g key={i}>
              <polygon points={pts.map((p) => p.join(',')).join(' ')} fill={`url(#${uid}-blade)`} />
              <line x1={pts[0][0]} y1={pts[0][1]} x2={pts[1][0]} y2={pts[1][1]} stroke="#9aa3ae" strokeOpacity="0.55" strokeWidth="1" />
            </g>
          );
        })}
      </g>
      <circle r={R} fill="none" stroke="#0b0f14" strokeWidth="5" />
      <circle r={R + 3} fill="none" stroke="#fff" strokeOpacity="0.12" />
    </svg>
  );
}

/** Read the microphone's RMS level (0–1) while `on`. Returns null until permission is granted. */
export function useMicLevel(on: boolean) {
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
      .catch(() => setError('Microphone blocked'));
    return () => {
      stop = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      ctx?.close();
    };
  }, [on]);
  return { level, error };
}

/* ── K-02 Gear loader ──────────────────────────────────────────────────────── */
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

/* ── K-03 Status lamp ──────────────────────────────────────────────────────── */
export type LampState = 'ok' | 'warn' | 'fault' | 'off';
const LAMP = { ok: '#19c27a', warn: '#ffb23f', fault: '#ff4d2e', off: '#6b7280' };

export function Lamp({ state, label }: { state: LampState; label?: string }) {
  const uid = uidOf(useId());
  const c = LAMP[state];
  return (
    <figure className={`k-lamp ${state}`}>
      <svg viewBox="0 0 80 96" width="72" aria-hidden="true">
        <defs>
          <radialGradient id={`${uid}-g`} cx="40%" cy="35%" r="65%">
            <stop offset="0" stopColor="#fff" stopOpacity={state === 'off' ? 0.4 : 1} />
            <stop offset="0.45" stopColor={c} />
            <stop offset="1" stopColor={state === 'off' ? '#3b4048' : c} stopOpacity={state === 'off' ? 1 : 0.75} />
          </radialGradient>
        </defs>
        {state !== 'off' && <circle cx="40" cy="38" r="30" fill={c} opacity="0.22" className="k-lamp-halo" />}
        <path d="M14 78 L22 66 H58 L66 78 Z" fill="#9097a2" />
        <rect x="10" y="78" width="60" height="10" rx="2" fill="#5c636e" />
        <circle cx="40" cy="40" r="22" fill={`url(#${uid}-g)`} className="k-lamp-glass" />
        <g fill="none" stroke="#2a3038" strokeWidth="2.2" strokeLinecap="round">
          <path d="M18 44 A22 22 0 0 1 62 44" />
          <path d="M40 18 V64" />
          <path d="M26 24 Q22 44 28 62" />
          <path d="M54 24 Q58 44 52 62" />
          <path d="M20 54 H60" />
        </g>
        <ellipse cx="33" cy="30" rx="5" ry="3" fill="#fff" opacity="0.7" transform="rotate(-30 33 30)" />
      </svg>
      {label && <figcaption className="mono">{label}</figcaption>}
    </figure>
  );
}

/* ── K-04 Rotary knob with detents ────────────────────────────────────────── */
export function Knob({ value, onChange, steps = 11, label = 'Gain' }: { value: number; onChange: (v: number) => void; steps?: number; label?: string }) {
  const ref = useRef<SVGSVGElement>(null);
  const span = 270;
  const angleOf = (v: number) => -span / 2 + (v / (steps - 1)) * span;
  const set = (e: { clientX: number; clientY: number }) => {
    const r = ref.current!.getBoundingClientRect();
    let a = (Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180) / Math.PI + 90;
    if (a > 180) a -= 360;
    a = Math.max(-span / 2, Math.min(span / 2, a));
    onChange(Math.round(((a + span / 2) / span) * (steps - 1)));
  };
  return (
    <svg
      ref={ref}
      viewBox="-110 -110 220 220"
      width="200"
      className="k-knob"
      role="slider"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={steps - 1}
      aria-valuenow={value}
      tabIndex={0}
      onPointerDown={(e) => {
        (e.currentTarget as Element).setPointerCapture(e.pointerId);
        set(e);
      }}
      onPointerMove={(e) => e.buttons === 1 && set(e)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowUp' || e.key === 'ArrowRight') onChange(Math.min(steps - 1, value + 1));
        if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') onChange(Math.max(0, value - 1));
      }}
    >
      {Array.from({ length: steps }, (_, i) => {
        const a = ((angleOf(i) - 90) * Math.PI) / 180;
        const on = i <= value;
        return (
          <g key={i}>
            <line x1={Math.cos(a) * 74} y1={Math.sin(a) * 74} x2={Math.cos(a) * 84} y2={Math.sin(a) * 84} className={`k-knob-tick ${on ? 'on' : ''}`} />
            <text x={Math.cos(a) * 97} y={Math.sin(a) * 97 + 4} textAnchor="middle" className={`k-knob-num ${i === value ? 'on' : ''}`}>{i}</text>
          </g>
        );
      })}
      <g className="k-knob-cap" style={{ transform: `rotate(${angleOf(value)}deg)` }}>
        <circle r="64" fill="#2a3038" />
        {Array.from({ length: 48 }, (_, i) => {
          const a = (i / 48) * TAU;
          return <line key={i} x1={Math.cos(a) * 58} y1={Math.sin(a) * 58} x2={Math.cos(a) * 64} y2={Math.sin(a) * 64} stroke="#4b535e" strokeWidth="2.4" />;
        })}
        <circle r="54" fill="url(#k-knob-face)" />
        <circle r="54" fill="none" stroke="#fff" strokeOpacity="0.5" transform="translate(0 1)" />
        <rect x="-3.5" y="-50" width="7" height="26" rx="3.5" fill="var(--volt)" />
      </g>
      <defs>
        <radialGradient id="k-knob-face" cx="40%" cy="30%" r="80%">
          <stop offset="0" stopColor="#f4f5f7" />
          <stop offset="1" stopColor="#a9afb8" />
        </radialGradient>
      </defs>
    </svg>
  );
}

/* ── K-05 Toggle lever ─────────────────────────────────────────────────────── */
export function Lever({ on, onChange, label = 'Main power' }: { on: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button type="button" className={`k-lever ${on ? 'on' : ''}`} role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}>
      <svg viewBox="0 0 140 170" width="130" aria-hidden="true">
        <rect x="14" y="20" width="112" height="140" rx="12" fill="#d9dce2" stroke="#9097a2" />
        {[[26, 32], [114, 32], [26, 148], [114, 148]].map(([x, y]) => (
          <g key={`${x}${y}`}>
            <circle cx={x} cy={y} r="4" fill="#7c838e" />
            <line x1={x - 2.6} x2={x + 2.6} y1={y} y2={y} stroke="#2a3038" strokeWidth="1.2" transform={`rotate(40 ${x} ${y})`} />
          </g>
        ))}
        <text x="26" y="64" className="k-lever-lbl on">ON</text>
        <text x="26" y="134" className="k-lever-lbl off">OFF</text>
        <rect x="58" y="56" width="24" height="72" rx="12" fill="#2a3038" />
        <g className="k-lever-arm">
          <rect x="64" y="38" width="12" height="58" rx="6" fill="url(#k-lever-steel)" />
          <circle cx="70" cy="38" r="13" fill="var(--volt)" />
          <circle cx="66" cy="34" r="4" fill="#fff" opacity="0.6" />
        </g>
        <circle cx="70" cy="96" r="9" fill="#5c636e" />
        <circle cx="122" cy="96" r="5" className="k-lever-led" />
        <defs>
          <linearGradient id="k-lever-steel" x1="0" x2="1">
            <stop offset="0" stopColor="#8b929d" />
            <stop offset="0.5" stopColor="#eef0f3" />
            <stop offset="1" stopColor="#7a818c" />
          </linearGradient>
        </defs>
      </svg>
    </button>
  );
}

/* ── K-06 Odometer ────────────────────────────────────────────────────────── */
export function Odometer({ value, digits = 6 }: { value: number; digits?: number }) {
  const s = String(Math.max(0, Math.floor(value))).padStart(digits, '0').slice(-digits);
  return (
    <div className="k-odo" role="img" aria-label={`Counter ${s}`}>
      {s.split('').map((d, i) => (
        <span key={i} className={`k-odo-win ${i === digits - 1 ? 'last' : ''}`}>
          <span className="k-odo-drum" style={{ transform: `translateY(${-Number(d) * 10}%)`, transitionDelay: `${(digits - 1 - i) * 40}ms` }}>
            {'0123456789'.split('').map((n) => (
              <b key={n}>{n}</b>
            ))}
          </span>
        </span>
      ))}
    </div>
  );
}

/* ── K-07 Pressure gauge with a sprung needle ─────────────────────────────── */
export function Gauge({ value, label = 'Load', unit = 'kPa', max = 100, redline = 0.8 }: { value: number; label?: string; unit?: string; max?: number; redline?: number }) {
  const [a, setA] = useState(value);
  const target = useRef(value);
  target.current = value;
  useEffect(() => {
    let raf = 0;
    const s = { x: value, v: 0 };
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const f = (target.current - s.x) * 0.06 - s.v * 0.22;
      s.v += f;
      s.x += s.v;
      if (Math.abs(target.current - s.x) < 0.0005 && Math.abs(s.v) < 0.0005) s.x = target.current;
      setA(reducedMotion ? target.current : s.x);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const sweep = 240;
  const deg = (t: number) => -sweep / 2 + t * sweep;
  const pt = (t: number, r: number) => {
    const rad = ((deg(t) - 90) * Math.PI) / 180;
    return [Math.cos(rad) * r, Math.sin(rad) * r];
  };
  const arc = (t0: number, t1: number, r: number) => {
    const [x0, y0] = pt(t0, r);
    const [x1, y1] = pt(t1, r);
    return `M${x0} ${y0} A${r} ${r} 0 ${(t1 - t0) * sweep > 180 ? 1 : 0} 1 ${x1} ${y1}`;
  };
  return (
    <svg viewBox="-110 -110 220 222" width="230" className="k-gauge" role="meter" aria-label={label} aria-valuenow={Math.round(value * max)} aria-valuemin={0} aria-valuemax={max}>
      <circle r="102" fill="url(#k-gauge-bez)" />
      <circle r="92" fill="#fbfbf8" stroke="#2a3038" strokeWidth="2" />
      <path d={arc(redline, 1, 80)} fill="none" stroke="#ff4d2e" strokeWidth="7" />
      {Array.from({ length: 41 }, (_, i) => {
        const t = i / 40;
        const major = i % 4 === 0;
        const [x0, y0] = pt(t, major ? 70 : 75);
        const [x1, y1] = pt(t, 84);
        return <line key={i} x1={x0} y1={y0} x2={x1} y2={y1} stroke="#1c2128" strokeWidth={major ? 2 : 0.8} />;
      })}
      {Array.from({ length: 11 }, (_, i) => {
        const [x, y] = pt(i / 10, 56);
        return <text key={i} x={x} y={y + 4} textAnchor="middle" className="k-gauge-num">{(i * max) / 10}</text>;
      })}
      <text y="34" textAnchor="middle" className="k-gauge-unit">{label} · {unit}</text>
      <g style={{ transform: `rotate(${deg(Math.max(-0.02, Math.min(1.02, a)))}deg)` }}>
        <path d="M-3 12 L0 -80 L3 12 Z" fill="var(--volt)" />
        <path d="M-4 12 L4 12 L2 24 L-2 24 Z" fill="#1c2128" />
      </g>
      <circle r="9" fill="#1c2128" />
      <circle r="3" fill="#9097a2" />
      <rect x="-30" y="52" width="60" height="20" rx="3" fill="#0b0f14" />
      <text y="66.5" textAnchor="middle" className="k-gauge-digits">{String(Math.round(Math.max(0, a) * max)).padStart(3, '0')}</text>
      <defs>
        <linearGradient id="k-gauge-bez" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f4f5f7" />
          <stop offset="1" stopColor="#8b929d" />
        </linearGradient>
      </defs>
    </svg>
  );
}
