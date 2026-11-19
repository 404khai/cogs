import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import './kit.css';
import { Blueprint } from '../components/Blueprint';
import { Footer, Nav } from '../components/SiteChrome';
import { Corners, EnergyBar, Segmented } from '../components/ui';
import { Aperture, Gauge, GearLoader, Knob, Lamp, Lever, Odometer, useMicLevel } from './Parts';
import type { ApertureState, LampState } from './Parts';

function Part({ code, name, note, usage, children, controls, wide }: {
  code: string; name: string; note: string; usage: string; children: ReactNode; controls?: ReactNode; wide?: boolean;
}) {
  return (
    <article className={`part ${wide ? 'wide' : ''}`} id={name.toLowerCase().replace(/\W+/g, '-')}>
      <Corners />
      <header className="part-head">
        <span className="mono part-code">{code}</span>
        <h2 className="display">{name}</h2>
      </header>
      <div className="part-stage">{children}</div>
      {controls && <div className="part-controls">{controls}</div>}
      <p className="part-note">{note}</p>
      <code className="part-usage mono">{usage}</code>
    </article>
  );
}

const AP_STATES: { value: ApertureState; label: string }[] = [
  { value: 'idle', label: 'Idle' },
  { value: 'listening', label: 'Listening' },
  { value: 'speaking', label: 'Speaking' },
  { value: 'muted', label: 'Muted' },
];
const AP_NOTES: Record<ApertureState, string> = {
  idle: 'Blades nearly shut, breathing slowly. Waiting for a wake word.',
  listening: 'Blades open with the input level; the VU ring fills and redlines on peaks.',
  speaking: 'The whole iris turns while blades pulse with the voice coming out.',
  muted: 'Shuttered tight. The ring goes dark red until the mic is live again.',
};

export default function Components() {
  const [ap, setAp] = useState<ApertureState>('listening');
  const [mic, setMic] = useState(false);
  const { level, error } = useMicLevel(mic);
  const [knob, setKnob] = useState(6);
  const [lever, setLever] = useState(true);
  const [count, setCount] = useState(1204);
  const [load, setLoad] = useState(0.42);
  const [lamp, setLamp] = useState<LampState>('ok');
  const [speed, setSpeed] = useState(0.5);

  // The odometer ticks over on its own, like units leaving the line.
  useEffect(() => {
    const id = setInterval(() => setCount((c) => c + 1 + Math.floor(Math.random() * 3)), 1600);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      <Blueprint />
      <Nav current="components" />
      <main className="kit">
        <header className="kit-head">
          <span className="mono eyebrow">Cogs / Components</span>
          <h1 className="display">The parts bin.</h1>
          <p>Machined interface parts for agents: listening, loading, status, controls and readouts. Everything is SVG and moves like hardware, with detents, springs and drums.</p>
        </header>

        <section className="feature" id="aperture">
          <Corners />
          <div className="feature-stage">
            <Aperture state={mic && ap !== 'muted' ? 'listening' : ap} level={mic && ap !== 'muted' ? level ?? 0 : undefined} size={300} />
          </div>
          <div className="feature-copy">
            <span className="mono part-code">K-01 · Featured</span>
            <h2 className="display">Aperture</h2>
            <p>
              A voice indicator built like a camera iris. Seven steel blades open and close over a lens, a 60-segment VU ring counts the level, and the core glows with the signal. It's the mechanical answer to a voice ring.
            </p>
            <Segmented<ApertureState> label="Aperture state" value={ap} onChange={(v) => { setAp(v); if (v !== 'listening') setMic(false); }} options={AP_STATES} />
            <p className="feature-state mono">{AP_NOTES[mic && ap !== 'muted' ? 'listening' : ap]}</p>
            <div className="feature-mic">
              <button className={`btn ${mic ? 'primary' : ''}`} onClick={() => { setMic((m) => !m); setAp('listening'); }}>
                {mic ? '● Live mic' : 'Use my microphone'}
              </button>
              <span className="mono">{error ? error : mic ? `Level ${String(Math.round((level ?? 0) * 100)).padStart(3, '0')}` : 'Simulated signal'}</span>
            </div>
            <code className="part-usage mono">{`<Aperture state="${ap}" level={micLevel} />`}</code>
          </div>
        </section>

        <div className="parts">
          <Part code="K-02" name="Gear loader" note="Three meshed gears, phased tooth-to-gap, turning at speeds set by their tooth counts. Use it for anything that takes a while." usage="<GearLoader speed={1} />"
            controls={<EnergyBar label="Speed" value={speed} onChange={setSpeed} segments={20} />}>
            <GearLoader size={190} speed={0.25 + speed * 2} running={speed > 0.02} />
          </Part>

          <Part code="K-03" name="Status lamp" note="A caged indicator lamp. OK glows steady, Warn breathes, Fault strobes and Off goes cold glass." usage={`<Lamp state="${lamp}" label="Core" />`}
            controls={<Segmented<LampState> label="Lamp state" value={lamp} onChange={setLamp} options={[{ value: 'ok', label: 'OK' }, { value: 'warn', label: 'Warn' }, { value: 'fault', label: 'Fault' }, { value: 'off', label: 'Off' }]} />}>
            <div className="lamp-row">
              <Lamp state={lamp} label="Core" />
              <Lamp state={lamp === 'off' ? 'off' : 'ok'} label="Bus" />
              <Lamp state={lamp === 'fault' ? 'fault' : lamp === 'off' ? 'off' : 'warn'} label="Temp" />
            </div>
          </Part>

          <Part code="K-04" name="Rotary knob" note="A knurled knob with 11 detents. Drag it round, scroll or use the arrow keys, and it snaps to each click with a little overshoot." usage={`<Knob value={${knob}} onChange={setGain} />`}>
            <Knob value={knob} onChange={setKnob} label="Gain" />
          </Part>

          <Part code="K-05" name="Toggle lever" note="A spring-thrown lever on a screwed plate, with a pilot LED. It's a switch you can hear." usage={`<Lever on={${lever}} onChange={setPower} />`}>
            <Lever on={lever} onChange={setLever} />
          </Part>

          <Part code="K-06" name="Odometer" note="Rolling number drums. Each digit turns a beat after the one to its right, like the real thing." usage={`<Odometer value={${count}} digits={6} />`}
            controls={<button className="btn" onClick={() => setCount((c) => c + 37)}>+37</button>}>
            <Odometer value={count} />
          </Part>

          <Part code="K-07" name="Pressure gauge" note="A sprung needle that overshoots and settles, a redline zone and a digital window. Push it past the red." usage={`<Gauge value={${load.toFixed(2)}} label="Load" />`}
            controls={<EnergyBar label="Load" value={load} onChange={setLoad} segments={20} />}>
            <Gauge value={load} />
          </Part>

          <Part code="K-08" name="Energy bar" wide note="The studio's segmented bar: drag it, or use the arrow keys. The top 20% runs hot. Leave out onChange for a read-only meter." usage="<EnergyBar label=&quot;Core charge&quot; value={v} onChange={setV} />">
            <div className="bar-demo">
              <EnergyBar label="Core charge" hint="glow" value={load} onChange={setLoad} />
              <EnergyBar label="Read-only meter" value={0.3 + speed * 0.6} segments={24} />
            </div>
          </Part>
        </div>
      </main>
      <Footer />
    </>
  );
}
