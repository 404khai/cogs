import { useState } from 'react';
import { ROSTER, serial } from '../lib/config';
import type { CogConfig } from '../lib/config';
import { chassisById } from '../lib/chassis';
import { Cog } from './Cog';
import { Corners, EnergyBar } from './ui';

function Card({ unit, index, onLoad }: { unit: (typeof ROSTER)[number]; index: number; onLoad: (c: CogConfig) => void }) {
  const [hover, setHover] = useState(false);
  const ch = chassisById(unit.chassis);
  return (
    <button className="card" onPointerEnter={() => setHover(true)} onPointerLeave={() => setHover(false)} onFocus={() => setHover(true)} onBlur={() => setHover(false)}
      onClick={() => onLoad(unit)} aria-label={`Load ${unit.name} into the studio`}>
      <Corners />
      <div className="card-top mono">
        <span>UNIT·{String(index + 1).padStart(2, '0')}</span>
        <span className="dot" style={{ background: unit.glow }} />
      </div>
      <div className="card-cog">
        <Cog config={unit} expression={hover ? 'happy' : undefined} />
      </div>
      <div className="card-meta">
        <div>
          <strong className="display">{unit.name}</strong>
          <span className="mono dim">{unit.role}</span>
        </div>
        <span className="mono dim">{ch.code}</span>
      </div>
      <EnergyBar label={`SN ${serial(unit)}`} value={0.35 + ((index * 37) % 60) / 100} segments={20} />
      <span className="card-cta mono">Load into studio →</span>
    </button>
  );
}

export function Roster({ onLoad }: { onLoad: (c: CogConfig) => void }) {
  return (
    <section className="roster" id="roster">
      <header className="section-head">
        <span className="mono idx">§ 02</span>
        <h2 className="display">The roster</h2>
        <p>Eight units already on the floor. Hover to say hello, click to pull one onto the bench.</p>
      </header>
      <div className="roster-grid">
        {ROSTER.map((u, i) => (
          <Card key={u.name} unit={u} index={i} onLoad={onLoad} />
        ))}
      </div>
    </section>
  );
}
