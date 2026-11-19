import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import './kit.css';
import { Blueprint } from '../components/Blueprint';
import { Footer, Nav } from '../components/SiteChrome';
import { Corners, EnergyBar, Segmented } from '../components/ui';
import { ROSTER } from '../lib/config';
import type { CogConfig, ScreenMode } from '../lib/config';
import { CogAvatar, CogBelt, CogComposer, CogRing, CogTyping, EMOTION, GearLoader, TinyGears, useMicrophone } from './CogKit';
import type { Emotion, VoiceState } from './CogKit';

const unitByName = (n: string) => ROSTER.find((u) => u.name === n) ?? ROSTER[0];

function Part({ code, name, note, usage, children, controls, wide }: {
  code: string; name: string; note: string; usage: string; children: ReactNode; controls?: ReactNode; wide?: boolean;
}) {
  return (
    <article className={`part ${wide ? 'wide' : ''}`}>
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

function UnitPicker({ value, onChange }: { value: string; onChange: (n: string) => void }) {
  return (
    <div className="unit-picker" role="radiogroup" aria-label="Unit">
      {ROSTER.map((u) => (
        <button key={u.name} role="radio" aria-checked={u.name === value} className={u.name === value ? 'active' : ''} onClick={() => onChange(u.name)} title={u.name}>
          <CogAvatar unit={{ ...u, screen: 'eyes' }} size={34} />
        </button>
      ))}
    </div>
  );
}

/* ── Chat demo: thread + composer, with a scripted agent on the other end ── */
type Msg = { from: 'user' | 'unit'; text: string };
const REPLIES = [
  'On it. I checked the last three builds: the flaky test is the date parser, and it only fails after midnight UTC.',
  'Done. I opened a pull request that pins the timezone in the test fixture. CI is green.',
  'Short answer: yes. Long answer: yes, with a migration. I drafted it as a plan you can approve.',
  'I searched the docs and the codebase. The setting lives in config/runtime.toml, under [cache].',
];
const HEARD = ['Can you look at why CI keeps failing?', 'Summarize what changed this week.', 'Where do we configure the cache?'];

function ChatDemo({ unit }: { unit: CogConfig }) {
  const [msgs, setMsgs] = useState<Msg[]>([{ from: 'unit', text: `Hi, I'm ${unit.name}. Type below, or press the mic and talk to me.` }]);
  const [text, setText] = useState('');
  const [state, setState] = useState<VoiceState>('idle');
  const [mic, setMic] = useState(false);
  const { level } = useMicrophone(mic);
  const n = useRef(0);
  const thread = useRef<HTMLDivElement>(null);

  useEffect(() => {
    thread.current?.scrollTo({ top: thread.current.scrollHeight, behavior: 'smooth' });
  }, [msgs]);

  const reply = () => {
    setState('processing');
    const full = REPLIES[n.current++ % REPLIES.length];
    setTimeout(() => {
      setState('speaking');
      setMsgs((m) => [...m, { from: 'unit', text: '' }]);
      let i = 0;
      const id = setInterval(() => {
        i += 3;
        setMsgs((m) => [...m.slice(0, -1), { from: 'unit', text: full.slice(0, i) }]);
        if (i >= full.length) {
          clearInterval(id);
          setState('idle');
        }
      }, 30);
    }, 1400);
  };

  const send = (t = text) => {
    setMsgs((m) => [...m, { from: 'user', text: t.trim() }]);
    setText('');
    reply();
  };

  const toggleMic = () => {
    if (state === 'listening') {
      setMic(false);
      send(HEARD[n.current % HEARD.length]);
    } else if (state === 'idle') {
      setMic(true);
      setState('listening');
    }
  };

  return (
    <div className="chat">
      <div className="chat-thread" ref={thread}>
        {msgs.map((m, i) => (
          <div key={i} className={`chat-msg ${m.from}`}>
            {m.from === 'unit' && <CogAvatar unit={{ ...unit, screen: 'eyes' }} size={34} />}
            <p>{m.text || '…'}</p>
          </div>
        ))}
        {state === 'processing' && <CogTyping unit={unit} screen="think">{unit.name} is thinking</CogTyping>}
      </div>
      <CogComposer
        unit={unit}
        state={state}
        level={mic ? level ?? undefined : undefined}
        value={text}
        onChange={setText}
        onSend={() => send()}
        onMic={toggleMic}
      />
      <p className="chat-hint mono">{state === 'listening' ? 'Talk, then press the mic again to send' : 'Enter to send · Shift+Enter for a new line'}</p>
    </div>
  );
}

/* ── Task card: an agent working through steps ───────────────────────────── */
const STEPS: { label: string; screen: ScreenMode }[] = [
  { label: 'Searching the codebase', screen: 'search' },
  { label: 'Thinking it through', screen: 'think' },
  { label: 'Writing the fix', screen: 'code' },
  { label: 'Running the test suite', screen: 'work' },
];
function TaskCard({ unit }: { unit: CogConfig }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s + 1) % (STEPS.length + 1)), 2200);
    return () => clearInterval(id);
  }, []);
  const done = step === STEPS.length;
  return (
    <div className="task-card">
      <CogAvatar unit={unit} size={64} screen={done ? 'eyes' : STEPS[step].screen} presence={done ? 'online' : 'busy'} />
      <ol>
        {STEPS.map((s, i) => (
          <li key={s.label} className={i < step || done ? 'done' : i === step ? 'now' : ''}>
            {i === step && !done ? <TinyGears size={19} /> : <i aria-hidden="true" />}
            {s.label}
          </li>
        ))}
      </ol>
      <EnergyBar label={done ? 'Done' : STEPS[step].label} value={done ? 1 : (step + 0.5) / STEPS.length} segments={20} />
    </div>
  );
}

const STATES: { value: VoiceState; label: string }[] = [
  { value: 'idle', label: 'Idle' },
  { value: 'listening', label: 'Listening' },
  { value: 'speaking', label: 'Speaking' },
  { value: 'processing', label: 'Processing' },
];

export default function Components() {
  const [ringUnit, setRingUnit] = useState('Rivet');
  const [ring, setRing] = useState<VoiceState>('listening');
  const [emotion, setEmotion] = useState<Emotion>('neutral');
  const [mic, setMic] = useState(false);
  const { level, error } = useMicrophone(mic);
  const [chatUnit, setChatUnit] = useState('Pinion');
  const [speed, setSpeed] = useState(0.5);
  const [belt, setBelt] = useState(0.4);

  return (
    <>
      <Blueprint />
      <Nav current="components" />
      <main className="kit">
        <header className="kit-head">
          <span className="mono eyebrow">Cogs / Components</span>
          <h1 className="display">Put a cog in your app.</h1>
          <p>
            Components built around the units: a voice ring, a chat composer with the bot perched on top, avatars, typing indicators and loaders. Pass any cog from the studio as <code>unit</code>, and its screen follows what it's doing.
          </p>
        </header>

        <section className="feature">
          <Corners />
          <div className="feature-stage">
            <ChatDemo key={chatUnit} unit={unitByName(chatUnit)} />
          </div>
          <div className="feature-copy">
            <span className="mono part-code">C-01 · Featured</span>
            <h2 className="display">CogComposer</h2>
            <p>
              A chat input with the unit perched on top. It reads along while you type, listens with a segmented LED edge that lights from the centre out, thinks while it works, and shows a waveform while it answers. The thread, typing indicator and avatars come from the same kit.
            </p>
            <UnitPicker value={chatUnit} onChange={setChatUnit} />
            <code className="part-usage mono">{`<CogComposer unit={${chatUnit.toLowerCase()}} state={state} level={mic.level} onSend={send} onMic={toggleMic} />`}</code>
          </div>
        </section>

        <section className="feature">
          <Corners />
          <div className="feature-stage">
            <CogRing unit={unitByName(ringUnit)} state={mic && ring === 'listening' ? 'listening' : ring} level={mic ? level ?? 0 : undefined} emotion={emotion} size={330} />
          </div>
          <div className="feature-copy">
            <span className="mono part-code">C-02 · Featured</span>
            <h2 className="display">CogRing</h2>
            <p>
              A voice ring, machined. The unit sits in a bearing race with rolling balls, and a crown of gear teeth extends with the voice like a spectrum. Processing turns the crown into a loader with a bright sweep. Emotion tints the teeth and the unit's eyes.
            </p>
            <Segmented<VoiceState> label="Ring state" value={ring} onChange={(v) => { setRing(v); if (v !== 'listening') setMic(false); }} options={STATES} />
            <div className="emotions" role="radiogroup" aria-label="Emotion">
              {(Object.keys(EMOTION) as Emotion[]).map((e) => (
                <button key={e} role="radio" aria-checked={e === emotion} className={`mono ${e === emotion ? 'active' : ''}`} onClick={() => setEmotion(e)}>
                  <i style={{ background: EMOTION[e] }} />
                  {e}
                </button>
              ))}
            </div>
            <UnitPicker value={ringUnit} onChange={setRingUnit} />
            <div className="feature-mic">
              <button className={`btn ${mic ? 'primary' : ''}`} onClick={() => { setMic((m) => !m); setRing('listening'); }}>
                {mic ? '● Live mic' : 'Use my microphone'}
              </button>
              <span className="mono">{error ?? (mic ? `Level ${String(Math.round((level ?? 0) * 100)).padStart(3, '0')}` : 'Simulated voice')}</span>
            </div>
            <code className="part-usage mono">{`<CogRing unit={unit} state="${ring}" emotion="${emotion}" level={mic.level} />`}</code>
          </div>
        </section>

        <div className="parts">
          <Part code="C-03" name="CogAvatar" note="The unit in a machined socket, with a presence lamp: online, busy (pulsing), away (sleepy eyes) and offline (powered down). Stack them for teams." usage={'<CogAvatar unit={unit} size={56} presence="busy" />'}>
            <div className="avatar-demo">
              <div className="avatar-row">
                {(['online', 'busy', 'away', 'offline'] as const).map((p, i) => (
                  <figure key={p}>
                    <CogAvatar unit={ROSTER[i * 2]} size={58} presence={p} />
                    <figcaption className="mono">{p}</figcaption>
                  </figure>
                ))}
              </div>
              <div className="avatar-stack" aria-label="Five agents">
                {ROSTER.slice(0, 5).map((u) => <CogAvatar key={u.name} unit={{ ...u, screen: 'eyes' }} size={40} />)}
                <span className="mono">+3 agents</span>
              </div>
            </div>
          </Part>

          <Part code="C-04" name="CogTyping" note="An inline status line for threads and lists. The unit's screen shows what it's doing while the dots tick." usage={'<CogTyping unit={unit} screen="search">Gimbal is searching</CogTyping>'}>
            <div className="typing-demo">
              <CogTyping unit={unitByName('Spindle')} screen="dots">Spindle is typing</CogTyping>
              <CogTyping unit={unitByName('Gimbal')} screen="search">Gimbal is searching</CogTyping>
              <CogTyping unit={unitByName('Ratchet')} screen="code">Ratchet is coding</CogTyping>
              <CogTyping unit={unitByName('Piston')} screen="think">Piston is thinking</CogTyping>
            </div>
          </Part>

          <Part code="C-05" name="Gear loader" note="Three meshed gears, phased tooth-to-gap, turning at speeds set by their tooth counts. Use it for anything that takes a while." usage="<GearLoader speed={1} />"
            controls={<EnergyBar label="Speed" value={speed} onChange={setSpeed} segments={20} />}>
            <GearLoader size={190} speed={0.25 + speed * 2} running={speed > 0.02} />
          </Part>

          <Part code="C-06" name="CogBelt" wide note="Sprocket units chained by timing belts in a zig-zag drive train, each belt its own colour with a packet riding it. Gear bodies turn while faces stay upright. Pass as many units as you like: handoffs, pipelines, syncs." usage={'<CogBelt units={[ratchet, cam, axle, coil]} belts={["#1c2128", "#ff6a2b", "#3657d8"]} />'}
            controls={<EnergyBar label="Belt speed" value={belt} onChange={setBelt} segments={24} />}>
            <div className="belt-demo">
              <CogBelt units={[unitByName('Ratchet'), { name: 'Cam', color: '#3657d8' }, { name: 'Axle', color: '#72c97c' }, { name: 'Coil', color: '#efe06a', glow: '#ffb23f' }]} speed={0.2 + belt * 2.4} running={belt > 0.02} />
            </div>
          </Part>

          <Part code="C-07" name="Task card" wide note="An agent working through a job. The avatar's screen switches with each step: search, think, code, then run. The lamp goes green when it's done." usage={'<CogAvatar unit={unit} screen={step.screen} presence="busy" />'}>
            <TaskCard unit={unitByName('Ratchet')} />
          </Part>
        </div>
      </main>
      <Footer />
    </>
  );
}
