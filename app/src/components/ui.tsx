import { useRef } from 'react';
import type { ReactNode } from 'react';
import type { Chassis } from '../lib/chassis';
import { Eyes } from './Eyes';
import type { Expression } from '../lib/expressions';

export function Corners() {
  return (
    <>
      <span className="corner tl" />
      <span className="corner tr" />
      <span className="corner bl" />
      <span className="corner br" />
    </>
  );
}

export function PanelHead({ index, title, aside }: { index: string; title: string; aside?: ReactNode }) {
  return (
    <div className="panel-head">
      <span className="mono idx">{index}</span>
      <span className="mono ttl">{title}</span>
      <span className="rule" />
      {aside && <span className="mono aside">{aside}</span>}
    </div>
  );
}

/** Segmented energy bar. Drag or use arrow keys to set; pass no onChange for a read-only meter. */
export function EnergyBar({ label, value, onChange, segments = 28, unit = '%', hint }: {
  label: string; value: number; onChange?: (v: number) => void; segments?: number; unit?: string; hint?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const filled = Math.round(value * segments);
  const set = (clientX: number) => {
    const r = ref.current!.getBoundingClientRect();
    onChange?.(Math.min(1, Math.max(0, (clientX - r.left) / r.width)));
  };
  const interactive = !!onChange;
  return (
    <div className={`energy ${interactive ? 'interactive' : ''}`}>
      <div className="energy-top">
        <span className="mono lbl">{label}</span>
        {hint && <span className="mono hint">{hint}</span>}
        <span className="mono val">
          {String(Math.round(value * 100)).padStart(3, '0')}
          <small>{unit}</small>
        </span>
      </div>
      <div
        ref={ref}
        className="energy-track"
        role={interactive ? 'slider' : 'meter'}
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(value * 100)}
        tabIndex={interactive ? 0 : -1}
        onPointerDown={(e) => {
          if (!interactive) return;
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          set(e.clientX);
        }}
        onPointerMove={(e) => interactive && e.buttons === 1 && set(e.clientX)}
        onKeyDown={(e) => {
          if (!interactive) return;
          if (e.key === 'ArrowRight' || e.key === 'ArrowUp') onChange(Math.min(1, value + 1 / segments));
          if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') onChange(Math.max(0, value - 1 / segments));
        }}
      >
        {Array.from({ length: segments }, (_, i) => (
          <i key={i} className={i < filled ? (i >= segments * 0.8 ? 'on hot' : 'on') : ''} data-lead={i === filled - 1 || undefined} />
        ))}
      </div>
    </div>
  );
}

export function Segmented<T extends string>({ value, options, onChange, label }: {
  value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string;
}) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} role="radio" aria-checked={value === o.value} className={value === o.value ? 'active' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function ChassisIcon({ ch }: { ch: Chassis }) {
  const v = ch.visor;
  return (
    <svg viewBox="30 40 340 320" aria-hidden="true">
      <path d={ch.path} className="ci-body" />
      <rect x={v.x} y={v.y} width={v.w} height={v.h} rx={v.r} className="ci-visor" />
      {ch.screws.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="8" className="ci-screw" />
      ))}
    </svg>
  );
}

export function EyeTile({ ex, glow, pupils, optics }: { ex: Expression; glow: string; pupils: boolean; optics: 'mono' | 'dual' }) {
  const uid = `tile-${ex.id}-${optics}`;
  return (
    <svg viewBox="0 0 120 76" aria-hidden="true">
      <rect x="1" y="1" width="118" height="74" rx="26" className="tile-bezel" />
      <rect x="7" y="7" width="106" height="62" rx="22" fill="#05080b" />
      <Eyes uid={uid} visor={{ x: 7, y: 7, w: 106, h: 62, r: 22 }} optics={optics} L={ex.L} R={ex.R} gaze={{ x: 0, y: 0 }} blink={0} glow={glow} charge={0.7} pupils={pupils} mode="eyes" />
    </svg>
  );
}

