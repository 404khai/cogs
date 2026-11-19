import { useEffect, useState } from 'react';
import './changelog.css';
import { Blueprint } from '../components/Blueprint';
import { Cog } from '../components/Cog';
import { Footer, Nav } from '../components/SiteChrome';
import { Corners } from '../components/ui';
import { DEFAULT, LOGO } from '../lib/config';
import type { CogConfig } from '../lib/config';
import { GH } from '../lib/site';

type Tag = 'Feature' | 'Chassis' | 'Brand' | 'Platform' | 'Foundation';

type Entry = {
  date: string; // ISO
  version: string;
  title: string;
  tag: Tag;
  lede: string;
  /** Add `pr` once work lands through pull requests: the item then links to it. */
  items: { title: string; body: string; pr?: number }[];
  /** The unit peeking in beside the entry. */
  unit?: Partial<CogConfig>;
};

// Newest first.
const ENTRIES: Entry[] = [
  {
    date: '2026-11-19',
    version: '0.6.0',
    title: 'The parts bin',
    tag: 'Feature',
    lede: 'A components page of machined interface parts for agents, led by an iris that listens.',
    items: [
      { title: 'Aperture', body: 'A voice indicator built like a camera iris: seven steel blades open with the input level over a glowing lens, inside a 60-segment VU ring. Idle, listening, speaking and muted states, driven by a simulated signal or your real microphone.' },
      { title: 'Gear loader', body: 'Three meshed gears turning at speeds set by their tooth counts, with an adjustable speed.' },
      { title: 'Status lamp', body: 'A caged indicator lamp: OK glows, Warn breathes, Fault strobes, Off goes cold.' },
      { title: 'Rotary knob', body: 'A knurled knob with 11 detents that snaps to each step with a little overshoot. Drag it, or use the arrow keys.' },
      { title: 'Toggle lever', body: 'A spring-thrown lever on a screwed plate, with a pilot LED.' },
      { title: 'Odometer and gauge', body: 'Rolling number drums that turn one after another, and a pressure gauge whose sprung needle overshoots, settles and can be pushed into the red.' },
      { title: 'Components in the nav', body: 'Components sits in the navbar, the footer and the docs sidebar, at /components.' },
    ],
    unit: { chassis: 'orb', color: '#d3d3cf', screen: 'wave' },
  },
  {
    date: '2026-11-18',
    version: '0.5.0',
    title: 'Agent displays, three new chassis and units that build themselves',
    tag: 'Feature',
    lede: 'The visor learns to show work in progress (thinking, searching, coding and working), and roster units now draft and assemble themselves as you scroll to them.',
    items: [
      { title: 'Thinking', body: 'A light chases round a ring of twelve LEDs while three satellites orbit a breathing core.' },
      { title: 'Search', body: 'A radar sweep with a fading wake. Blips flare as the beam passes over them.' },
      { title: 'Coding', body: 'Dot-matrix code scrolls up a terminal above a prompt with a blinking block cursor.' },
      { title: 'Working', body: 'Three solid LED gears mesh and turn on the glass, phased tooth-to-gap and spun at speeds set by their tooth counts.' },
      { title: 'Rampart, Lynx, Fold', body: 'Three more chassis, for 20 in all: a crenellated plate, a cat-eared unit with its status light below the visor, and a folded single-eye form.' },
      { title: 'Self-assembling roster', body: 'Each roster card drafts its unit in blueprint lines, fills it with paint, pops in the fasteners, seats the visor and powers on the light and eyes. The glow behind each unit is gone, so they sit straight on the card.' },
      { title: 'Animated exports', body: 'The new displays animate with SVG SMIL, so exported SVGs keep moving in browsers and READMEs.' },
    ],
    unit: { chassis: 'hex', color: '#9d8df0', screen: 'think' },
  },
  {
    date: '2026-11-18',
    version: '0.4.0',
    title: 'Docs, a changelog and the assembly line',
    tag: 'Feature',
    lede: 'Cogs gets a proper manual, a record of what shipped, and a factory floor in the footer where units roll past a QA gate.',
    items: [
      { title: 'Docs', body: 'Quickstart, the studio, every chassis and expression rendered live, display and power, the Cog JSON reference, export and how to extend. ⌘K searches it.' },
      { title: 'Changelog', body: 'This page: every release, newest first, with a unit from that release peeking in.' },
      { title: 'The assembly line', body: 'A meshing gear train drives a conveyor. Units look surprised under the scanner, and Flange supervises from the gate.' },
      { title: 'Builder credit', body: 'The title block gains a Builder cell and a Source cell, and the footer links to 404khai.' },
    ],
    unit: { chassis: 'gear', color: '#e8603f', glow: '#ffb23f', expression: 'happy', pupils: false },
  },
  {
    date: '2026-11-18',
    version: '0.3.0',
    title: 'Cogs as JSON',
    tag: 'Feature',
    lede: 'Every cog is now a small, portable JSON document you can copy, download, edit, paste or upload to build it back.',
    items: [
      { title: 'Source panel', body: 'Panel 09 shows the live JSON. Edit it and press ⌘↵ to build, or Revert to throw your edits away.' },
      { title: 'Paste anywhere', body: 'Paste cog JSON anywhere on the page outside a text field and the studio builds it.' },
      { title: 'Forgiving validation', body: 'Broken JSON is rejected with the parser’s message. Unknown chassis, bad colours and out-of-range numbers fall back to defaults with a warning each.' },
      { title: 'Safer share links', body: 'Links that carry a cog in the URL go through the same validator.' },
    ],
    unit: { chassis: 'ticket', color: '#d3d3cf', expression: 'focused', screen: 'dots' },
  },
  {
    date: '2026-11-18',
    version: '0.2.1',
    title: 'Flange, the house unit',
    tag: 'Brand',
    lede: 'An orange sprocket with amber eyes and a short temper becomes the face of Cogs.',
    items: [
      { title: 'Live logo', body: 'The navbar logo is a real cog, so it watches your cursor and blinks.' },
      { title: 'logo.svg', body: 'bun run logo server-renders Flange at rest for the README and favicon.' },
    ],
    unit: { chassis: 'gear', color: '#e8603f', glow: '#ffb23f', expression: 'angry', pupils: false },
  },
  {
    date: '2026-11-18',
    version: '0.2.0',
    title: 'Seven new chassis and a notched visor',
    tag: 'Chassis',
    lede: 'The foundry grows from 10 forms to 17, and status lights now sit in a notch cut into the visor recess.',
    items: [
      { title: 'Keystone, Dome, Clamp, Bracket', body: 'Four forms traced from the reference sketches: a flat-topped keystone, a dome, a pipe clamp with horns and a stepped bracket.' },
      { title: 'Crest, Cross, Ticket', body: 'Three originals: a shield, a plus-shaped plate and a ticket stub with bites out of its sides.' },
      { title: 'Notched recess', body: 'When the light sits right above the visor, both share one machined recess, like the reference bots.' },
      { title: 'Bloom, reshaped', body: 'Bloom’s outline is now a true union of petals, so it reads as a flower instead of a star.' },
    ],
    unit: { chassis: 'keystone', color: '#9d8df0', expression: 'surprised' },
  },
  {
    date: '2026-11-17',
    version: '0.1.1',
    title: 'Names with grease under the nails',
    tag: 'Platform',
    lede: 'Units are named after machine parts, and the project builds on Bun.',
    items: [
      { title: 'Machine-part names', body: 'Forty names such as Rivet, Sprocket, Gasket, Pinion, Clevis, Tappet and Knurl, with only a few ending in -et.' },
      { title: 'Roll a name', body: 'A dice button beside the designation picks a new name without touching the rest of the unit.' },
      { title: 'Bun', body: 'bun install, bun run dev and bun run build. A bunfig runs scripts on the Bun runtime, so Node isn’t required.' },
    ],
    unit: { chassis: 'cross', color: '#72c97c', expression: 'wink' },
  },
  {
    date: '2026-11-17',
    version: '0.1.0',
    title: 'The first cogs',
    tag: 'Foundation',
    lede: 'An avatar studio for machines, on white blueprint paper: pick a chassis, tune the optics, set the mood and ship it as SVG.',
    items: [
      { title: 'Ten chassis', body: 'Parametric SVG plates with machined bevels, fasteners and a recessed visor, from Octa to Sprocket.' },
      { title: 'Twelve expressions', body: 'Lids, tilts and cheek crescents over dot-matrix LED eyes, tweened between moods.' },
      { title: 'Alive by default', body: 'Eyes follow the cursor, glance around when idle and blink on their own schedule.' },
      { title: 'Energy bars', body: 'Core charge, Curiosity and Blink rate as segmented bars you can drag.' },
      { title: 'Blueprint stage', body: 'Dimension lines and callouts that redraw for every chassis, with parallax tilt.' },
      { title: 'Export and share', body: 'SVG, PNG at 1024 px and share links that keep the cog in the URL.' },
    ],
    unit: { chassis: 'octa', color: '#7cc9ea', expression: 'idle' },
  },
];

const fmt = (iso: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', { ...opts, timeZone: 'UTC' });
const monthKey = (iso: string) => iso.slice(0, 7);
const MONTHS = [...new Set(ENTRIES.map((e) => monthKey(e.date)))];
const vid = (v: string) => `v${v.replace(/\./g, '-')}`;

export default function Changelog() {
  const [active, setActive] = useState(ENTRIES[0].version);
  useEffect(() => {
    const onScroll = () => {
      let current = ENTRIES[0].version;
      for (const el of document.querySelectorAll<HTMLElement>('[data-version]')) {
        if (el.getBoundingClientRect().top < window.innerHeight * 0.3) current = el.dataset.version!;
      }
      setActive(current);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <Blueprint />
      <Nav current="changelog" />
      <main className="changelog">
        <header className="cl-head">
          <div className="cl-head-art" aria-hidden="true">
            <Corners />
            <span className="mono cl-fig">FIG. 00 — HOUSE UNIT</span>
            <div className="cl-head-cog">
              <Cog config={{ ...LOGO, curiosity: 1 }} />
            </div>
            <span className="mono cl-dim">Ø 316 · Z10</span>
          </div>
          <div className="cl-head-copy">
            <span className="mono eyebrow">Cogs / Changelog</span>
            <h1 className="display">What’s new?</h1>
            <p>Everything that has rolled off the line, newest first.</p>
            <a className="mono cl-gh" href={GH}>Follow along on GitHub ↗</a>
          </div>
        </header>

        <div className="cl-body">
          <nav className="cl-rail" aria-label="Releases">
            <b className="display">2026</b>
            {MONTHS.map((m) => (
              <div key={m} className="cl-month">
                <span className="mono">{fmt(`${m}-01`, { month: 'long' })}</span>
                {ENTRIES.filter((e) => monthKey(e.date) === m).map((e) => (
                  <a key={e.version} href={`#${vid(e.version)}`} aria-current={e.version === active ? 'true' : undefined}>
                    <i />
                    <span className="mono">v{e.version}</span>
                  </a>
                ))}
              </div>
            ))}
          </nav>

          <div className="cl-entries">
            {ENTRIES.map((e, i) => {
              const sameDay = i > 0 && ENTRIES[i - 1].date === e.date;
              const continues = ENTRIES[i + 1]?.date === e.date;
              return (
                <article
                  key={e.version}
                  id={vid(e.version)}
                  data-version={e.version}
                  className={['cl-entry', sameDay && 'same-day', continues && 'continues'].filter(Boolean).join(' ')}
                >
                  {e.unit && (
                    <span className={`cl-peek ${i % 2 ? 'left' : 'right'}`} aria-hidden="true">
                      <Cog config={{ ...DEFAULT, ...e.unit }} />
                    </span>
                  )}
                  <div className="cl-meta">
                    {!sameDay && <time dateTime={e.date}>{fmt(e.date, { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()}</time>}
                    <span className="cl-version mono">v{e.version}</span>
                  </div>
                  <h2 className="display">{e.title}</h2>
                  <span className={`cl-tag tag-${e.tag.toLowerCase()} mono`}>{e.tag}</span>
                  <p className="cl-lede">{e.lede}</p>
                  <div className="cl-items">
                    {e.items.map((it, j) => (
                      <div key={it.title} className="cl-item">
                        <span className="mono cl-n">{String(j + 1).padStart(2, '0')}</span>
                        <h3 className="display">{it.title}</h3>
                        <p>{it.body}</p>
                        {it.pr ? (
                          <a className="mono" href={`${GH}/pull/${it.pr}`}>
                            Shipped in <span>#{it.pr}</span>
                          </a>
                        ) : (
                          <span className="mono cl-shipped">
                            Shipped in <span>v{e.version}</span>
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
