import type { CSSProperties } from 'react';
import { chassisById } from '../lib/chassis';

const d = (s: number): CSSProperties => ({ ['--d' as string]: `${s}s` });

/**
 * Blueprint linework for a chassis, in the cog's own 400×400 space. Lay it over a <Cog> and add
 * `.go` to an ancestor: the lines draft themselves, then fade as the painted unit takes over.
 */
export function DraftOverlay({ chassisId }: { chassisId: string }) {
  const ch = chassisById(chassisId);
  const [x0, y0, x1, y1] = ch.box;
  const v = ch.visor;
  const li = ch.light;
  const dimY = Math.max(14, y0 - 20);
  const dimX = Math.max(14, x0 - 20);
  const lcx = li.x + li.w / 2;
  const lcy = li.y + li.h / 2;

  return (
    <svg className="draft" viewBox="0 0 400 400" aria-hidden="true">
      <line x1="200" y1={y0 - 30} x2="200" y2={y1 + 30} pathLength={1} className="d-center d-draw" style={d(0)} />
      <line x1={x0 - 30} y1="200" x2={x1 + 30} y2="200" pathLength={1} className="d-center d-draw" style={d(0.05)} />

      <path d={ch.path} pathLength={1} className="d-line d-draw" style={d(0.1)} />
      <rect x={v.x} y={v.y} width={v.w} height={v.h} rx={v.r} pathLength={1} className="d-line d-draw" style={d(0.45)} />
      <rect
        x={li.x} y={li.y} width={li.w} height={li.h} rx={Math.min(li.w, li.h) / 2} pathLength={1}
        className="d-line d-draw" style={d(0.6)} transform={li.angle ? `rotate(${li.angle} ${lcx} ${lcy})` : undefined}
      />
      {ch.screws.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="7" pathLength={1} className="d-line d-draw" style={d(0.7 + i * 0.05)} />
      ))}

      {/* dimensions */}
      <g className="d-dim">
        <line x1={x0} y1={dimY} x2={x1} y2={dimY} pathLength={1} className="d-draw" style={d(0.75)} />
        <line x1={x0} y1={dimY - 6} x2={x0} y2={dimY + 6} pathLength={1} className="d-draw" style={d(0.75)} />
        <line x1={x1} y1={dimY - 6} x2={x1} y2={dimY + 6} pathLength={1} className="d-draw" style={d(0.75)} />
        <line x1={dimX} y1={y0} x2={dimX} y2={y1} pathLength={1} className="d-draw" style={d(0.85)} />
        <line x1={dimX - 6} y1={y0} x2={dimX + 6} y2={y0} pathLength={1} className="d-draw" style={d(0.85)} />
        <line x1={dimX - 6} y1={y1} x2={dimX + 6} y2={y1} pathLength={1} className="d-draw" style={d(0.85)} />
        <text x="200" y={dimY - 7} textAnchor="middle" className="d-text" style={d(1)}>{x1 - x0}</text>
        <text x={dimX - 7} y={(y0 + y1) / 2} textAnchor="middle" className="d-text" style={d(1.05)} transform={`rotate(-90 ${dimX - 7} ${(y0 + y1) / 2})`}>
          {y1 - y0}
        </text>
        <text x={x1} y={y1 + 26} textAnchor="end" className="d-text" style={d(1.1)}>{ch.code}</text>
      </g>
    </svg>
  );
}
