import { useEffect, useRef } from 'react';
import type { Ref } from 'react';
import { chassisById } from '../lib/chassis';
import { expressionById } from '../lib/expressions';
import type { CogConfig } from '../lib/config';
import { Cog } from './Cog';
import { Corners } from './ui';

// Overlay coordinate space: the cog's 400×400 viewBox sits at (0,0) inside this larger frame.
const VB = { x: -120, y: -64, w: 640, h: 528 };

function Callout({ from, elbow, endX, label, sub, left }: {
  from: [number, number]; elbow: [number, number]; endX: number; label: string; sub?: string; left?: boolean;
}) {
  const pts = `${from[0]},${from[1]} ${elbow[0]},${elbow[1]} ${endX},${elbow[1]}`;
  return (
    <g className="callout">
      <circle cx={from[0]} cy={from[1]} r="3.2" className="anno-dot" />
      <polyline points={pts} className="anno-line" />
      <text x={endX} y={elbow[1] - 6} textAnchor={left ? 'start' : 'end'} className="anno-text strong">{label}</text>
      {sub && <text x={endX} y={elbow[1] + 13} textAnchor={left ? 'start' : 'end'} className="anno-text">{sub}</text>}
    </g>
  );
}

export function Stage({ config, svgRef }: { config: CogConfig; svgRef: Ref<SVGSVGElement> }) {
  const ch = chassisById(config.chassis);
  const ex = expressionById(config.expression);
  const [x0, y0, x1, y1] = ch.box;
  const li = ch.light;
  const lc: [number, number] = [li.x + li.w / 2, li.y + li.h / 2];
  const v = ch.visor;
  const screw = [...ch.screws].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0];
  const dimY = y0 - 26;
  const dimX = x0 - 26;
  const optics = config.optics === 'auto' ? ch.optics : config.optics;

  const tiltRef = useRef<HTMLDivElement>(null);
  const coordRef = useRef<HTMLSpanElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  // Parallax tilt + coordinate readout, written straight to the DOM (no re-render).
  useEffect(() => {
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = stageRef.current?.getBoundingClientRect();
        if (!r || !tiltRef.current) return;
        const nx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width / 2)));
        const ny = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height / 2)));
        tiltRef.current.style.setProperty('--rx', `${(-ny * 7).toFixed(2)}deg`);
        tiltRef.current.style.setProperty('--ry', `${(nx * 9).toFixed(2)}deg`);
        if (coordRef.current) coordRef.current.textContent = `X ${nx >= 0 ? '+' : ''}${nx.toFixed(3)}  Y ${ny >= 0 ? '+' : ''}${ny.toFixed(3)}`;
      });
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  return (
    <div className="stage" ref={stageRef}>
      <Corners />
      <div className="stage-bar">
        <span className="mono">FIG. 01 — UNIT PREVIEW</span>
        <span className="mono dim">{ch.code} · {ex.code} · {optics.toUpperCase()}</span>
        <span className="mono coord" ref={coordRef}>X +0.000  Y +0.000</span>
      </div>
      <div className="ruler top" />
      <div className="ruler left" />

      <div className="stage-canvas">
        <div className="stage-frame">
          <svg className="anno" viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB.h}`} aria-hidden="true">
            <defs>
              <marker id="anno-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M0 1 L9 5 L0 9" fill="none" stroke="currentColor" strokeWidth="1.4" />
              </marker>
            </defs>
            <g className="orbit">
              <circle cx="200" cy="200" r="214" className="anno-ring" />
              <circle cx="200" cy="200" r="232" className="anno-ring fine" />
            </g>
            <line x1="200" y1={-40} x2="200" y2={440} className="anno-center" />
            <line x1={-100} y1="200" x2={500} y2="200" className="anno-center" />

            <g key={ch.id} className="anno-draw">
              <line x1={x0} y1={y0 - 6} x2={x0} y2={dimY - 8} className="anno-ext" />
              <line x1={x1} y1={y0 - 6} x2={x1} y2={dimY - 8} className="anno-ext" />
              <line x1={x0} y1={dimY} x2={x1} y2={dimY} className="anno-line" markerStart="url(#anno-arr)" markerEnd="url(#anno-arr)" />
              <rect x={200 - 34} y={dimY - 9} width="68" height="18" className="anno-chip" />
              <text x="200" y={dimY + 4} textAnchor="middle" className="anno-text strong">W {x1 - x0}.00</text>

              <line x1={x0 - 6} y1={y0} x2={dimX - 8} y2={y0} className="anno-ext" />
              <line x1={x0 - 6} y1={y1} x2={dimX - 8} y2={y1} className="anno-ext" />
              <line x1={dimX} y1={y0} x2={dimX} y2={y1} className="anno-line" markerStart="url(#anno-arr)" markerEnd="url(#anno-arr)" />
              <g transform={`rotate(-90 ${dimX} ${(y0 + y1) / 2})`}>
                <rect x={dimX - 34} y={(y0 + y1) / 2 - 9} width="68" height="18" className="anno-chip" />
                <text x={dimX} y={(y0 + y1) / 2 + 4} textAnchor="middle" className="anno-text strong">H {y1 - y0}.00</text>
              </g>

              <Callout from={lc} elbow={[x1 + 28, Math.min(lc[1], y0 + 24)]} endX={x1 + 118} label="STATUS LED" sub="PULSE 3.2s" />
              <Callout from={[v.x + v.w - 14, v.y + v.h / 2]} elbow={[x1 + 28, v.y + v.h / 2 + 28]} endX={x1 + 118} label={`OPTICS · ${ex.code}`} sub={ex.name.toUpperCase()} />
              <Callout from={screw} elbow={[x0 - 28, Math.max(screw[1] + 20, y1 - 10)]} endX={x0 - 112} label={`M3 × ${ch.screws.length}`} sub="FASTENER" left />
            </g>
          </svg>

          <div className="tilt" ref={tiltRef}>
            <div className="bob">
              <Cog config={config} svgRef={svgRef} className="stage-cog" />
            </div>
          </div>
        </div>
      </div>

      <div className="stage-foot">
        <div>
          <span className="mono dim">DESIGNATION</span>
          <strong className="display">{config.name || 'Unnamed'}</strong>
        </div>
        <p className="quote">“{ex.note}”</p>
      </div>
      <div className="scanline" />
    </div>
  );
}
