import { useEffect, useRef, useState } from 'react';
import { gearPoints, roundedPoly } from '../lib/chassis';
import { meshChain } from '../lib/gears';
import { DEFAULT, LOGO } from '../lib/config';
import type { CogConfig } from '../lib/config';
import { reducedMotion } from '../lib/pointer';
import { Cog } from './Cog';

/* ── Gear train ──────────────────────────────────────────
 * Gears are chained by pitch radius (module × teeth / 2) and phased so every
 * tooth sits in its neighbour's gap. Speed is ∝ teeth with alternating
 * direction, so they stay meshed forever.
 */
const M = 6; // module
const SEC_PER_TOOTH = 0.55;

type Gear = { z: number; cx: number; cy: number; phase: number; dir: 1 | -1; tone?: 'volt' | 'ink' };

const chain = (start: { z: number; cx: number; cy: number; tone?: Gear['tone'] }, links: { z: number; deg: number; tone?: Gear['tone'] }[]): Gear[] =>
  meshChain<{ tone?: Gear['tone'] }>(M, start, links);

const GEARS = [
  ...chain({ z: 26, cx: 150, cy: 130 }, [
    { z: 12, deg: -28, tone: 'volt' },
    { z: 18, deg: 24 },
    { z: 9, deg: -36, tone: 'ink' },
  ]),
  ...chain({ z: 22, cx: 1060, cy: 118 }, [
    { z: 11, deg: 205, tone: 'ink' },
    { z: 16, deg: 150 },
    { z: 8, deg: 215, tone: 'volt' },
  ]),
];

function GearShape({ g }: { g: Gear }) {
  const pitch = (M * g.z) / 2;
  const root = pitch - M * 1.25;
  const tip = pitch + M;
  const hub = Math.max(7, pitch * 0.22);
  const rim = root - M * 1.4;
  const spokes = g.z > 14 ? 5 : 0;
  return (
    <g
      className={`gw-gear ${g.tone ?? ''}`}
      style={{
        transformOrigin: `${g.cx}px ${g.cy}px`,
        animationDuration: `${g.z * SEC_PER_TOOTH}s`,
        animationDirection: g.dir === 1 ? 'normal' : 'reverse',
      }}
    >
      <path d={roundedPoly(gearPoints(g.cx, g.cy, g.z, root, tip, g.phase), 1.6)} className="gw-body" />
      <circle cx={g.cx} cy={g.cy} r={pitch} className="gw-pitch" />
      {spokes > 0 && <circle cx={g.cx} cy={g.cy} r={rim} className="gw-line" />}
      {Array.from({ length: spokes }, (_, i) => {
        const a = g.phase + (i / spokes) * Math.PI * 2;
        return <line key={i} x1={g.cx + Math.cos(a) * hub} y1={g.cy + Math.sin(a) * hub} x2={g.cx + Math.cos(a) * rim} y2={g.cy + Math.sin(a) * rim} className="gw-line" />;
      })}
      <circle cx={g.cx} cy={g.cy} r={hub} className="gw-hub" />
      <circle cx={g.cx} cy={g.cy} r={hub * 0.4} className="gw-axle" />
    </g>
  );
}

/* ── Conveyor riders ────────────────────────────────────── */
const BELT = { x0: 96, x1: 1104, top: 252, y: 268, r: 16 };
const LOOP_S = 26; // seconds for a rider to cross the belt
const GATE = { x: 600, w: 92, top: 112 };

const mk = (p: Partial<CogConfig>): CogConfig => ({ ...DEFAULT, curiosity: 0.85, ...p });
const RIDERS: CogConfig[] = [
  mk({ name: 'Rivet', chassis: 'octa', color: '#7cc9ea' }),
  mk({ name: 'Clevis', chassis: 'cross', color: '#e46fdc', expression: 'happy' }),
  mk({ name: 'Gimbal', chassis: 'hex', color: '#9d8df0', expression: 'lookup' }),
  mk({ name: 'Piston', chassis: 'capsule', color: '#e8603f', expression: 'focused' }),
  mk({ name: 'Collet', chassis: 'keystone', color: '#efe06a', expression: 'sleepy' }),
  mk({ name: 'Pinion', chassis: 'dome', color: '#3657d8', screen: 'wave' }),
];

/** An assembly line: a gear train drives the belt, units ride through a QA scanner, Flange supervises. */
export function Gearworks() {
  const riderRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [scanning, setScanning] = useState<number>(-1);
  const [passed, setPassed] = useState(0);

  useEffect(() => {
    const t0 = performance.now();
    let raf = 0;
    let lastScan = -1;
    const n = RIDERS.length;
    const gateP = (GATE.x - BELT.x0) / (BELT.x1 - BELT.x0);
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      const base = reducedMotion ? 0 : (t - t0) / 1000 / LOOP_S;
      let scan = -1;
      riderRefs.current.forEach((el, i) => {
        if (!el) return;
        const p = (base + i / n) % 1;
        el.style.left = `${p * 100}%`;
        el.style.opacity = String(Math.min(1, p / 0.04, (1 - p) / 0.04));
        if (Math.abs(p - gateP) < 0.035) scan = i;
      });
      if (scan !== lastScan) {
        if (lastScan >= 0 && scan === -1) setPassed((c) => c + 1);
        lastScan = scan;
        setScanning(scan);
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const pct = (x: number) => `${(x / 1200) * 100}%`;

  return (
    <div className="gearworks" aria-label="Animated assembly line: gears drive a conveyor carrying cog units through a scanner">
      <svg viewBox="0 0 1200 320" className="gw-svg" aria-hidden="true">
        <defs>
          <linearGradient id="gw-beam" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#46d6ff" stopOpacity="0.55" />
            <stop offset="1" stopColor="#46d6ff" stopOpacity="0.04" />
          </linearGradient>
          <marker id="gw-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0 1 L9 5 L0 9" fill="none" stroke="currentColor" strokeWidth="1.4" />
          </marker>
        </defs>

        {/* drive belts from the end gears down to the pulleys */}
        <line x1={GEARS[0].cx} y1={GEARS[0].cy} x2={BELT.x0} y2={BELT.y} className="gw-drive" />
        <line x1={GEARS[4].cx} y1={GEARS[4].cy} x2={BELT.x1} y2={BELT.y} className="gw-drive" />

        {GEARS.map((g, i) => (
          <GearShape key={i} g={g} />
        ))}

        {/* QA gate */}
        <g className={`gw-gate ${scanning >= 0 ? 'on' : ''}`}>
          <rect x={GATE.x - GATE.w / 2 - 10} y={GATE.top} width="10" height={BELT.top - GATE.top} rx="3" className="gw-post" />
          <rect x={GATE.x + GATE.w / 2} y={GATE.top} width="10" height={BELT.top - GATE.top} rx="3" className="gw-post" />
          <rect x={GATE.x - GATE.w / 2 - 18} y={GATE.top - 14} width={GATE.w + 36} height="16" rx="5" className="gw-lintel" />
          <rect x={GATE.x - 22} y={GATE.top - 9} width="44" height="6" rx="3" className="gw-lamp" />
          <rect x={GATE.x - GATE.w / 2} y={GATE.top + 2} width={GATE.w} height={BELT.top - GATE.top - 2} className="gw-beam" fill="url(#gw-beam)" />
          <line x1={GATE.x - GATE.w / 2} x2={GATE.x + GATE.w / 2} y1={GATE.top + 4} y2={GATE.top + 4} className="gw-scanline" />
        </g>

        {/* conveyor */}
        <rect x={BELT.x0 - BELT.r} y={BELT.y - BELT.r} width={BELT.x1 - BELT.x0 + BELT.r * 2} height={BELT.r * 2} rx={BELT.r} className="gw-belt" />
        <line x1={BELT.x0} x2={BELT.x1} y1={BELT.top + 1.5} y2={BELT.top + 1.5} className="gw-tread" />
        <line x1={BELT.x0} x2={BELT.x1} y1={BELT.y + BELT.r - 1.5} y2={BELT.y + BELT.r - 1.5} className="gw-tread back" />
        {[BELT.x0, BELT.x1].map((x) => (
          <g key={x} className="gw-pulley" style={{ transformOrigin: `${x}px ${BELT.y}px` }}>
            <circle cx={x} cy={BELT.y} r={BELT.r - 4} className="gw-hub" />
            <line x1={x - 8} x2={x + 8} y1={BELT.y} y2={BELT.y} className="gw-line" />
            <line x1={x} x2={x} y1={BELT.y - 8} y2={BELT.y + 8} className="gw-line" />
          </g>
        ))}
        {Array.from({ length: 9 }, (_, i) => {
          const x = BELT.x0 + 40 + i * 116;
          return <rect key={i} x={x} y={BELT.y + BELT.r} width="8" height={312 - BELT.y - BELT.r} className="gw-leg" />;
        })}
        <line x1="20" x2="1180" y1="312" y2="312" className="gw-floor" />

        {/* annotations */}
        <g className="gw-anno">
          <line x1={BELT.x0} x2={BELT.x0 + 150} y1="296" y2="296" markerEnd="url(#gw-arr)" />
          <text x={BELT.x0} y="291">LINE 01 · 40 u/s</text>
          <text x={GATE.x} y={GATE.top - 22} textAnchor="middle">QA GATE</text>
          <text x={GEARS[0].cx} y="28" textAnchor="middle">DRIVE · Z{GEARS[0].z} · M{M}</text>
          <text x={GEARS[4].cx} y="28" textAnchor="middle">IDLER · Z{GEARS[4].z}</text>
        </g>
      </svg>

      <div className="gw-foreman" style={{ left: pct(GATE.x) }}>
        <Cog config={{ ...LOGO, expression: scanning >= 0 ? 'focused' : 'suspicious', curiosity: 0.9 }} />
      </div>

      <div className="gw-track" style={{ left: pct(BELT.x0), right: `calc(100% - ${pct(BELT.x1)})` }}>
        {RIDERS.map((r, i) => (
          <div
            key={r.name}
            ref={(el) => {
              riderRefs.current[i] = el;
            }}
            className="gw-rider"
          >
            <Cog config={r} expression={scanning === i ? 'surprised' : undefined} />
          </div>
        ))}
      </div>

      <div className="gw-readout mono">
        <span>Units inspected</span>
        <b>{String(1204 + passed).padStart(5, '0')}</b>
      </div>
    </div>
  );
}
