import { useEffect, useRef, useState } from 'react';
import { CHASSIS, chassisById } from '../lib/chassis';
import { EXPRESSIONS, expressionById } from '../lib/expressions';
import { GLOWS, PAINTS, randomConfig, randomName, serial, encodeConfig, parseCog } from '../lib/config';
import type { CogConfig, ScreenMode, OpticsMode } from '../lib/config';
import { Stage } from './Stage';
import { JsonPanel } from './JsonPanel';
import { ChassisIcon, Corners, EnergyBar, EyeTile, PanelHead, Segmented } from './ui';

type Log = { t: string; msg: string };
const now = () => new Date().toTimeString().slice(0, 8);

function download(blob: Blob, name: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function serialize(svg: SVGSVGElement, size: number) {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('width', String(size));
  clone.setAttribute('height', String(size));
  clone.removeAttribute('class');
  return new XMLSerializer().serializeToString(clone);
}

function useTelemetry(charge: number) {
  const [t, setT] = useState({ temp: 0.4, bus: 0.3, sync: 0.9, spark: Array.from({ length: 48 }, () => 0.5) });
  useEffect(() => {
    const id = setInterval(() => {
      setT((p) => {
        const n = (base: number, j: number) => Math.min(1, Math.max(0.02, base + (Math.random() - 0.5) * j));
        const next = n(0.25 + charge * 0.55, 0.12);
        return { temp: n(0.2 + charge * 0.5, 0.06), bus: n(0.3 + charge * 0.4, 0.3), sync: n(0.92, 0.08), spark: [...p.spark.slice(1), next] };
      });
    }, 700);
    return () => clearInterval(id);
  }, [charge]);
  return t;
}

export function Studio({ config, setConfig }: { config: CogConfig; setConfig: (c: CogConfig) => void }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [log, setLog] = useState<Log[]>([{ t: now(), msg: 'foundry online' }, { t: now(), msg: `unit ${config.name.toLowerCase()} mounted` }]);
  const tel = useTelemetry(config.charge);
  const ch = chassisById(config.chassis);
  const ex = expressionById(config.expression);
  const optics = config.optics === 'auto' ? ch.optics : config.optics;

  const push = (msg: string) => setLog((l) => [{ t: now(), msg }, ...l].slice(0, 6));
  const update = (patch: Partial<CogConfig>, msg?: string) => {
    setConfig({ ...config, ...patch });
    if (msg) push(msg);
  };
  const randomize = () => {
    const next = randomConfig(config);
    setConfig(next);
    push(`randomized → ${next.name.toLowerCase()}`);
  };
  const cycleExpr = (d: number) => {
    const i = EXPRESSIONS.findIndex((x) => x.id === config.expression);
    const next = EXPRESSIONS[(i + d + EXPRESSIONS.length) % EXPRESSIONS.length];
    update({ expression: next.id }, `expression → ${next.name.toLowerCase()}`);
  };

  const exportSvg = () => {
    if (!svgRef.current) return;
    download(new Blob([serialize(svgRef.current, 1024)], { type: 'image/svg+xml' }), `cog-${config.name.toLowerCase() || 'unit'}.svg`);
    push('exported .svg');
  };
  const exportPng = () => {
    if (!svgRef.current) return;
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = c.height = 1024;
      c.getContext('2d')!.drawImage(img, 0, 0, 1024, 1024);
      c.toBlob((b) => b && download(b, `cog-${config.name.toLowerCase() || 'unit'}.png`));
    };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(serialize(svgRef.current, 1024));
    push('exported .png @1024');
  };
  const copyLink = async () => {
    const url = `${location.origin}${location.pathname}#c=${encodeConfig(config)}`;
    try {
      await navigator.clipboard.writeText(url);
      push('share link copied');
    } catch {
      push('clipboard unavailable');
    }
  };

  // Keyboard: R randomize, ←/→ cycle expressions.
  const keys = useRef({ randomize, cycleExpr, build: setConfig, log: push });
  keys.current = { randomize, cycleExpr, build: setConfig, log: push };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.metaKey || e.ctrlKey) return;
      if ((e.target as HTMLElement).getAttribute('role') === 'slider') return;
      if (e.key === 'r') keys.current.randomize();
      if (e.key === 'ArrowRight') keys.current.cycleExpr(1);
      if (e.key === 'ArrowLeft') keys.current.cycleExpr(-1);
    };
    // Paste cog JSON anywhere outside a text field to build it.
    const onPaste = (e: ClipboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const text = e.clipboardData?.getData('text') ?? '';
      if (!text.trim().startsWith('{')) return;
      const res = parseCog(text);
      if ('error' in res) return keys.current.log('paste ignored: not a cog');
      e.preventDefault();
      keys.current.build(res.config);
      keys.current.log(`built ${res.config.name.toLowerCase()} from paste`);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('paste', onPaste);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('paste', onPaste);
    };
  }, []);

  const sparkPath = tel.spark.map((v, i) => `${i === 0 ? 'M' : 'L'}${(i / (tel.spark.length - 1)) * 200} ${36 - v * 32}`).join(' ');

  return (
    <section className="studio" id="studio">
      {/* ── Identity / telemetry ─────────────────────────── */}
      <aside className="panel identity">
        <Corners />
        <div className="id-sec">
        <PanelHead index="01" title="IDENTITY" aside={<span className="live">LIVE</span>} />
        <label className="field">
          <span className="mono lbl">Designation</span>
          <span className="name-row">
            <input className="name-input display" value={config.name} maxLength={16} spellCheck={false}
              onChange={(e) => setConfig({ ...config, name: e.target.value })}
              onBlur={() => push(`renamed → ${config.name.toLowerCase()}`)} />
            <button type="button" className="btn ghost" aria-label="Roll a new name" title="Roll a new name"
              onClick={() => {
                const name = randomName(config.name);
                update({ name }, `renamed → ${name.toLowerCase()}`);
              }}>
              <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
                <rect x="2.5" y="2.5" width="15" height="15" rx="3.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="7" cy="7" r="1.4" fill="currentColor" /><circle cx="13" cy="13" r="1.4" fill="currentColor" />
                <circle cx="13" cy="7" r="1.4" fill="currentColor" /><circle cx="7" cy="13" r="1.4" fill="currentColor" />
                <circle cx="10" cy="10" r="1.4" fill="currentColor" />
              </svg>
            </button>
          </span>
        </label>
        <dl className="spec">
          <div><dt>Serial</dt><dd>SN {serial(config)}</dd></div>
          <div><dt>Chassis</dt><dd>{ch.code} {ch.name}</dd></div>
          <div><dt>Finish</dt><dd><i className="sw" style={{ background: config.color }} />{config.color.toUpperCase()}</dd></div>
          <div><dt>Optics</dt><dd>{optics} · {config.screen}</dd></div>
          <div><dt>Mood</dt><dd>{ex.code} {ex.name}</dd></div>
        </dl>
        </div>

        <div className="id-sec">
        <PanelHead index="02" title="TELEMETRY" />
        <div className="telemetry">
          <EnergyBar label="Core temp" value={tel.temp} unit="°" segments={22} />
          <EnergyBar label="Bus load" value={tel.bus} segments={22} />
          <EnergyBar label="Sync" value={tel.sync} segments={22} />
          <div className="spark">
            <div className="spark-head">
              <span className="mono lbl">Neural activity</span>
              <span className="mono val">{(tel.spark[tel.spark.length - 1] * 9.8).toFixed(2)} THz</span>
            </div>
            <svg viewBox="0 0 200 40" preserveAspectRatio="none">
              <path d={`${sparkPath} L200 40 L0 40 Z`} className="spark-fill" />
              <path d={sparkPath} className="spark-line" />
            </svg>
          </div>
        </div>
        </div>

        <div className="id-sec">
        <PanelHead index="03" title="LOG" />
        <ol className="log mono">
          {log.map((l, i) => (
            <li key={`${l.t}-${i}-${l.msg}`} style={{ opacity: 1 - i * 0.14 }}>
              <span>{l.t}</span> {l.msg}
            </li>
          ))}
        </ol>
        </div>
      </aside>

      {/* ── Stage ───────────────────────────────────────── */}
      <div className="stage-col">
        <Stage config={config} svgRef={svgRef} />
        <div className="stage-actions">
          <button className="btn ghost" onClick={() => cycleExpr(-1)} aria-label="Previous expression">←</button>
          <button className="btn primary" onClick={randomize}>
            <span>Randomize</span>
            <kbd>R</kbd>
          </button>
          <button className="btn ghost" onClick={() => cycleExpr(1)} aria-label="Next expression">→</button>
          <span className="spacer" />
          <button className="btn" onClick={exportSvg}>SVG ↓</button>
          <button className="btn" onClick={exportPng}>PNG ↓</button>
          <button className="btn" onClick={copyLink}>Share ⧉</button>
        </div>
        <JsonPanel config={config} onBuild={setConfig} onLog={push} download={download} />
      </div>

      {/* ── Controls ────────────────────────────────────── */}
      <aside className="panel controls">
        <Corners />
        <PanelHead index="04" title="CHASSIS" aside={`${CHASSIS.length} FORMS`} />
        <div className="chassis-grid">
          {CHASSIS.map((c) => (
            <button key={c.id} className={`chassis-btn ${c.id === config.chassis ? 'active' : ''}`} onClick={() => update({ chassis: c.id }, `chassis → ${c.name.toLowerCase()}`)} title={c.name}>
              <ChassisIcon ch={c} />
              <span className="mono">{c.code.slice(3)}</span>
            </button>
          ))}
        </div>

        <PanelHead index="05" title="FINISH" aside={config.color.toUpperCase()} />
        <div className="swatches">
          {PAINTS.map((p) => (
            <button key={p.hex} className={`swatch ${p.hex === config.color ? 'active' : ''}`} style={{ background: p.hex }} title={p.name} aria-label={p.name}
              onClick={() => update({ color: p.hex }, `finish → ${p.name.toLowerCase()}`)} />
          ))}
          <label className="swatch custom" title="Custom">
            <input type="color" value={config.color} onChange={(e) => setConfig({ ...config, color: e.target.value })} aria-label="Custom finish" />
          </label>
        </div>

        <PanelHead index="06" title="EXPRESSION" aside="← →" />
        <div className="expr-grid">
          {EXPRESSIONS.map((x) => (
            <button key={x.id} className={`expr-btn ${x.id === config.expression ? 'active' : ''}`} onClick={() => update({ expression: x.id, screen: 'eyes' }, `expression → ${x.name.toLowerCase()}`)}>
              <EyeTile ex={x} glow={config.glow} pupils={config.pupils} optics={optics} />
              <span className="mono">{x.name}</span>
            </button>
          ))}
        </div>

        <PanelHead index="07" title="DISPLAY" />
        <div className="row">
          <Segmented<ScreenMode> label="Display mode" value={config.screen} onChange={(v) => update({ screen: v }, `display → ${v}`)}
            options={[{ value: 'eyes', label: 'Eyes' }, { value: 'wave', label: 'Voice' }, { value: 'dots', label: 'Typing' }, { value: 'glyph', label: 'Glyph' }]} />
        </div>
        <div className="row split">
          <Segmented<OpticsMode> label="Optics" value={config.optics} onChange={(v) => update({ optics: v }, `optics → ${v}`)}
            options={[{ value: 'auto', label: 'Auto' }, { value: 'mono', label: 'Mono' }, { value: 'dual', label: 'Dual' }]} />
          <button className={`toggle ${config.pupils ? 'on' : ''}`} role="switch" aria-checked={config.pupils} onClick={() => update({ pupils: !config.pupils }, `pupils ${config.pupils ? 'off' : 'on'}`)}>
            <span className="mono">Pupils</span>
            <i />
          </button>
        </div>
        <div className="glows">
          <span className="mono lbl">Emitter</span>
          {GLOWS.map((g) => (
            <button key={g.hex} className={`glow ${g.hex === config.glow ? 'active' : ''}`} style={{ ['--g' as string]: g.hex }} title={g.name} aria-label={`${g.name} glow`}
              onClick={() => update({ glow: g.hex }, `emitter → ${g.name.toLowerCase()}`)} />
          ))}
        </div>

        <PanelHead index="08" title="POWER" />
        <div className="power">
          <EnergyBar label="Core charge" hint="glow" value={config.charge} onChange={(v) => setConfig({ ...config, charge: v })} />
          <EnergyBar label="Curiosity" hint="gaze" value={config.curiosity} onChange={(v) => setConfig({ ...config, curiosity: v })} />
          <EnergyBar label="Blink rate" hint="hz" value={config.blink} onChange={(v) => setConfig({ ...config, blink: v })} />
        </div>
      </aside>
    </section>
  );
}
