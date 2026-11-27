import { useEffect, useId, useRef, useState } from 'react';
import type { Ref } from 'react';
import { chassisById } from '../lib/chassis';
import { expressionById } from '../lib/expressions';
import type { CogConfig } from '../lib/config';
import { createFace, faceFrame, lightNotch, RECESS_PAD, stepFace } from '../lib/face';
import type { FaceFrame, Gaze } from '../lib/face';
import { shade, luminance } from '../lib/color';
import { pointer, reducedMotion } from '../lib/pointer';
import { Eyes } from './Eyes';

type Props = {
  config: CogConfig;
  /** Override the configured expression (e.g. on hover). */
  expression?: string;
  /** Follow the global pointer with the eyes. */
  track?: boolean;
  svgRef?: Ref<SVGSVGElement>;
  className?: string;
};

export function Cog({ config, expression, track = true, svgRef, className }: Props) {
  const uid = 'c' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const ch = chassisById(config.chassis);
  const expr = expressionById(expression ?? config.expression);
  const optics = config.optics === 'auto' ? ch.optics : config.optics;

  const [frame, setFrame] = useState<FaceFrame>(() => ({ L: { ...expr.L }, R: { ...expr.R }, gaze: { x: 0, y: 0 }, blink: 0 }));
  const live = useRef({ expr, config, track });
  live.current = { expr, config, track };
  const elRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const s = createFace(live.current.expr, performance.now());
    let visible = true;
    const io = new IntersectionObserver(([en]) => (visible = en.isIntersecting));
    if (elRef.current) io.observe(elRef.current);

    let raf = 0;
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      if (!visible) return;
      const { expr: ex, config: cf, track: tr } = live.current;

      // Gaze: follow the pointer while it is moving, otherwise let the face wander.
      let look: Gaze | null = null;
      if (tr && t - pointer.t < 2500 && pointer.t > 0 && elRef.current) {
        const r = elRef.current.getBoundingClientRect();
        const dx = (pointer.x - (r.left + r.width / 2)) / Math.max(260, r.width * 0.9);
        const dy = (pointer.y - (r.top + r.height / 2)) / Math.max(260, r.height * 0.9);
        const m = Math.hypot(dx, dy);
        const k = m > 1 ? 1 / m : 1;
        look = { x: dx * k * cf.curiosity, y: dy * k * cf.curiosity };
      }
      if (stepFace(s, t, { expr: ex, curiosity: cf.curiosity, blink: cf.blink, look, still: reducedMotion })) setFrame(faceFrame(s));
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, []);

  const c = config.color;
  const lum = luminance(c);
  const v = ch.visor;
  const li = ch.light;
  const lcx = li.x + li.w / 2;
  const lcy = li.y + li.h / 2;
  const id = (s: string) => `${uid}-${s}`;
  const pad = RECESS_PAD;
  const { tab, recessTop } = lightNotch(ch);

  return (
    <svg
      ref={(el) => {
        elRef.current = el;
        if (typeof svgRef === 'function') svgRef(el);
        else if (svgRef) (svgRef as { current: SVGSVGElement | null }).current = el;
      }}
      className={className}
      viewBox="0 0 400 400"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`${config.name}, a ${ch.name.toLowerCase()} cog looking ${expr.name.toLowerCase()}`}
    >
      <defs>
        <linearGradient id={id('body')} x1="0.15" y1="0" x2="0.55" y2="1">
          <stop offset="0" stopColor={shade(c, 0.1, 0.04)} />
          <stop offset="0.45" stopColor={c} />
          <stop offset="1" stopColor={shade(c, -0.1, 0.02)} />
        </linearGradient>
        <linearGradient id={id('sheen')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.32" />
          <stop offset="0.4" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={id('rim')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={shade(c, -0.14)} />
          <stop offset="1" stopColor={shade(c, 0.06)} />
        </linearGradient>
        <linearGradient id={id('rimU')} gradientUnits="userSpaceOnUse" x1="0" y1={recessTop} x2="0" y2={v.y + v.h + pad}>
          <stop offset="0" stopColor={shade(c, -0.15)} />
          <stop offset="0.5" stopColor={shade(c, -0.06)} />
          <stop offset="1" stopColor={shade(c, 0.05)} />
        </linearGradient>
        <linearGradient id={id('screen')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#10161d" />
          <stop offset="0.35" stopColor="#030507" />
          <stop offset="1" stopColor="#06090c" />
        </linearGradient>
        <linearGradient id={id('gloss')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.22" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <clipPath id={id('clip')}>
          <path d={ch.path} />
        </clipPath>
        <clipPath id={id('sclip')}>
          <rect x={v.x} y={v.y} width={v.w} height={v.h} rx={v.r} />
        </clipPath>
        <filter id={id('shadow')} x="-30%" y="-30%" width="160%" height="170%">
          <feDropShadow dx="0" dy="16" stdDeviation="14" floodColor={shade(c, -0.35)} floodOpacity={lum > 0.7 ? 0.3 : 0.38} />
        </filter>
        <filter id={id('soft')} x="-50%" y="-200%" width="200%" height="500%">
          <feGaussianBlur stdDeviation="8" />
        </filter>
        <filter id={id('led')} x="-60%" y="-300%" width="220%" height="700%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="4" result="b" />
          <feFlood floodColor={config.glow} floodOpacity={0.4 + 0.6 * config.charge} />
          <feComposite operator="in" in2="b" result="g" />
          <feMerge>
            <feMergeNode in="g" />
            <feMergeNode in="g" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Layers carry cg-* classes so a parent can stage an assembly animation (see Roster). */}
      {/* contact shadow */}
      <ellipse className="cg-shadow" cx="200" cy={Math.min(ch.box[3] + 34, 382)} rx={(ch.box[2] - ch.box[0]) * 0.36} ry="9" fill={shade(c, -0.4)} opacity="0.22" filter={`url(#${id('soft')})`} />

      {/* body */}
      <g className="cg-body">
      <g filter={`url(#${id('shadow')})`}>
        <path d={ch.path} fill={`url(#${id('body')})`} />
      </g>
      <g clipPath={`url(#${id('clip')})`}>
        <path d={ch.path} fill={`url(#${id('sheen')})`} />
        <path d={ch.path} fill="none" stroke="#fff" strokeOpacity={lum > 0.75 ? 0.9 : 0.55} strokeWidth="6" transform="translate(0 3)" />
        <path d={ch.path} fill="none" stroke={shade(c, -0.3)} strokeOpacity="0.35" strokeWidth="6" transform="translate(0 -3)" />
      </g>
      </g>

      {/* fasteners */}
      {ch.screws.map(([x, y], i) => (
        <g key={i} className="cg-screw" style={{ ['--i' as string]: i }}>
          <circle cx={x} cy={y + 1} r="7.2" fill="#fff" opacity={lum > 0.75 ? 0.8 : 0.4} />
          <circle cx={x} cy={y} r="6.6" fill={shade(c, -0.52)} />
          <circle cx={x - 1.2} cy={y - 1.4} r="2.2" fill={shade(c, -0.3)} />
        </g>
      ))}

      {/* recess: visor rim, merged with a notch for the status light when it sits right above */}
      <g className="cg-visor">
      <g fill={shade(c, 0.2)} opacity={lum > 0.75 ? 1 : 0.7} transform="translate(0 1.4)">
        <rect x={v.x - pad} y={v.y - pad} width={v.w + pad * 2} height={v.h + pad * 2} rx={v.r + pad} />
        {tab && <rect x={tab.x} y={tab.y} width={tab.w} height={tab.h} rx={tab.r} />}
      </g>
      <g fill={`url(#${id('rimU')})`}>
        <rect x={v.x - pad} y={v.y - pad} width={v.w + pad * 2} height={v.h + pad * 2} rx={v.r + pad} />
        {tab && <rect x={tab.x} y={tab.y} width={tab.w} height={tab.h} rx={tab.r} />}
      </g>
      </g>

      {/* status light */}
      <g className="cg-light">
      <g transform={li.angle ? `rotate(${li.angle} ${lcx} ${lcy})` : undefined}>
        {!tab && (
          <>
            <rect x={li.x - 6} y={li.y - 6} width={li.w + 12} height={li.h + 12} rx={(Math.min(li.w, li.h) + 12) / 2} fill={shade(c, 0.2)} opacity={lum > 0.75 ? 1 : 0.7} transform="translate(0 1.2)" />
            <rect x={li.x - 6} y={li.y - 6} width={li.w + 12} height={li.h + 12} rx={(Math.min(li.w, li.h) + 12) / 2} fill={`url(#${id('rim')})`} />
          </>
        )}
        <rect x={li.x} y={li.y} width={li.w} height={li.h} rx={Math.min(li.w, li.h) / 2} fill={shade(config.glow, 0.38)} filter={`url(#${id('led')})`}>
          {!reducedMotion && <animate attributeName="opacity" values="1;0.72;1" dur="3.2s" repeatCount="indefinite" />}
        </rect>
      </g>
      </g>

      <g className="cg-visor">
      <rect x={v.x - 2} y={v.y - 2} width={v.w + 4} height={v.h + 4} rx={v.r + 2} fill={shade(c, -0.45)} opacity="0.5" />
      <rect x={v.x} y={v.y} width={v.w} height={v.h} rx={v.r} fill={`url(#${id('screen')})`} />
      </g>
      <g className="cg-eyes" clipPath={`url(#${id('sclip')})`}>
        <Eyes uid={uid} visor={v} optics={optics} L={frame.L} R={frame.R} gaze={frame.gaze} blink={frame.blink}
          glow={config.glow} charge={config.charge} pupils={config.pupils} mode={config.screen} />
        <rect x={v.x + v.r * 0.4} y={v.y + 3} width={v.w - v.r * 0.8} height={v.h * 0.16} rx={v.h * 0.08} fill={`url(#${id('gloss')})`} />
      </g>
    </svg>
  );
}
