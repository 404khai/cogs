import type { ReactNode } from 'react';
import { CHASSIS } from '../lib/chassis';
import { EXPRESSIONS } from '../lib/expressions';
import { DEFAULT, GLOWS, PAINTS, toJSON, LOGO } from '../lib/config';
import type { CogConfig } from '../lib/config';
import { GH } from '../lib/site';
import { Cog } from '../components/Cog';
import { EyeTile } from '../components/ui';

/* ── Code blocks with a tiny highlighter ───────────────── */
function highlight(line: string, lang: string): ReactNode[] {
  if (lang === 'sh') {
    const c = line.indexOf('  #');
    const [cmd, note] = c >= 0 ? [line.slice(0, c), line.slice(c)] : [line, ''];
    return [cmd.trim() ? <span key="p" className="tok-prompt">$ </span> : null, cmd, note && <span key="n" className="tok-note">{note}</span>];
  }
  const out: ReactNode[] = [];
  const re = /(\/\/.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')(\s*:)?|\b(true|false|null|const|export|type|import|from|return)\b|(-?\b\d+(?:\.\d+)?\b)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(line))) {
    if (m.index > last) out.push(line.slice(last, m.index));
    if (m[1]) out.push(<span key={k++} className="tok-note">{m[1]}</span>);
    else if (m[2]) out.push(<span key={k++} className={m[3] ? 'tok-key' : 'tok-str'}>{m[2]}</span>, m[3] ?? '');
    else if (m[4]) out.push(<span key={k++} className="tok-kw">{m[4]}</span>);
    else if (m[5]) out.push(<span key={k++} className="tok-num">{m[5]}</span>);
    last = re.lastIndex;
  }
  out.push(line.slice(last));
  return out;
}

export function Code({ children, lang = 'sh', title }: { children: string; lang?: string; title?: string }) {
  return (
    <figure className="doc-code" data-lang={lang}>
      <figcaption className="mono">
        <span>{title ?? lang}</span>
        <button
          type="button"
          className="mono"
          onClick={(e) => {
            navigator.clipboard?.writeText(children).then(() => {
              const b = e.currentTarget;
              b.textContent = 'Copied';
              setTimeout(() => (b.textContent = 'Copy'), 1200);
            });
          }}
        >
          Copy
        </button>
      </figcaption>
      <pre>
        <code>
          {children.split('\n').map((line, i) => (
            <span key={i} className="doc-code-line">
              {highlight(line, lang)}
              {'\n'}
            </span>
          ))}
        </code>
      </pre>
    </figure>
  );
}

const Unit = ({ c, className = 'doc-unit' }: { c: Partial<CogConfig>; className?: string }) => (
  <span className={className}>
    <Cog config={{ ...DEFAULT, ...c }} />
  </span>
);

const Kbd = ({ children }: { children: ReactNode }) => <kbd className="doc-kbd">{children}</kbd>;

/* ── Pages ─────────────────────────────────────────────── */
export type DocSection = { title: string; body: ReactNode };
export type DocPage = {
  id: string;
  title: string;
  group: 'Get started' | 'Concepts' | 'Reference';
  summary: string;
  unit: Partial<CogConfig>;
  sections: DocSection[];
};

export const PAGES: DocPage[] = [
  {
    id: 'quickstart',
    title: 'Quickstart',
    group: 'Get started',
    summary: 'Build your first cog in under a minute and ship it as SVG.',
    unit: { chassis: 'octa', color: '#7cc9ea', expression: 'happy' },
    sections: [
      {
        title: 'Build a cog',
        body: (
          <>
            <ol className="doc-steps">
              <li><b>Pick a chassis.</b> Panel 04 holds 17 forms. The silhouette sets the default optics: one eye or two.</li>
              <li><b>Paint it.</b> Choose a finish in panel 05, or open the rainbow swatch for any colour.</li>
              <li><b>Set the mood.</b> Panel 06 has 12 expressions. <Kbd>←</Kbd> <Kbd>→</Kbd> cycle through them.</li>
              <li><b>Tune it.</b> Pick a display mode and emitter, then drag the power bars.</li>
              <li><b>Ship it.</b> Export SVG or PNG, copy a share link, or copy the JSON.</li>
            </ol>
            <p>
              Not sure where to start? Press <Kbd>R</Kbd> to randomize until something looks back at you.
            </p>
          </>
        ),
      },
      {
        title: 'Run it locally',
        body: (
          <>
            <p>Cogs is a Vite + React app that runs on <a href="https://bun.sh">Bun</a>. Node isn’t required.</p>
            <Code>{`git clone ${GH}.git
cd cogs/app
bun install
bun run dev  # http://localhost:5173`}</Code>
            <p>
              <code>bun run build</code> type-checks and builds the studio, docs and changelog into <code>dist/</code>.
            </p>
          </>
        ),
      },
    ],
  },
  {
    id: 'studio',
    title: 'The studio',
    group: 'Get started',
    summary: 'A tour of the bench: nine numbered panels, the stage and the shortcuts.',
    unit: { chassis: 'plate', color: '#efe06a', expression: 'lookup' },
    sections: [
      {
        title: 'Panels',
        body: (
          <table className="doc-table">
            <thead><tr><th>#</th><th>Panel</th><th>What it does</th></tr></thead>
            <tbody>
              <tr><td>01</td><td>Identity</td><td>Name (roll one with the dice), serial number derived from the cog, and a spec sheet.</td></tr>
              <tr><td>02</td><td>Telemetry</td><td>Decorative live meters that run hotter as Core charge rises.</td></tr>
              <tr><td>03</td><td>Log</td><td>Every change you make, timestamped.</td></tr>
              <tr><td>04</td><td>Chassis</td><td>The plate the unit is machined from.</td></tr>
              <tr><td>05</td><td>Finish</td><td>Body colour, including a custom picker.</td></tr>
              <tr><td>06</td><td>Expression</td><td>The mood, shown as LED eyes.</td></tr>
              <tr><td>07</td><td>Display</td><td>Display mode, optics, pupils and emitter colour.</td></tr>
              <tr><td>08</td><td>Power</td><td>Core charge, Curiosity and Blink rate.</td></tr>
              <tr><td>09</td><td>Source · JSON</td><td>The cog as JSON: copy, download, edit, paste or upload.</td></tr>
            </tbody>
          </table>
        ),
      },
      {
        title: 'The stage',
        body: (
          <p>
            Fig. 01 draws the unit on a blueprint sheet. Its dimension lines and callouts for the status LED, optics and fasteners redraw for every chassis. The unit tilts toward your cursor, and the readout in the corner shows where the cursor is.
          </p>
        ),
      },
      {
        title: 'Shortcuts',
        body: (
          <table className="doc-table">
            <tbody>
              <tr><td><Kbd>R</Kbd></td><td>Randomize the unit</td></tr>
              <tr><td><Kbd>←</Kbd> <Kbd>→</Kbd></td><td>Previous and next expression</td></tr>
              <tr><td><Kbd>⌘</Kbd> <Kbd>↵</Kbd></td><td>Build from the JSON editor</td></tr>
              <tr><td><Kbd>⌘</Kbd> <Kbd>V</Kbd></td><td>Paste cog JSON anywhere outside a text field to build it</td></tr>
              <tr><td><Kbd>⌘</Kbd> <Kbd>K</Kbd></td><td>Search these docs</td></tr>
            </tbody>
          </table>
        ),
      },
    ],
  },
  {
    id: 'chassis',
    title: 'Chassis',
    group: 'Concepts',
    summary: `${CHASSIS.length} machined plates, each with its own visor, status light and fasteners.`,
    unit: { chassis: 'clamp', color: '#efe06a', expression: 'idle' },
    sections: [
      {
        title: 'Every form',
        body: (
          <>
            <p>
              Each chassis is parametric SVG on a 400 × 400 grid: an outline path, a visor rectangle, a status light and a list of screws. The <b>default optics</b> decide whether Auto shows one eye or two.
            </p>
            <div className="doc-chassis">
              {CHASSIS.map((c) => (
                <figure key={c.id}>
                  <Unit c={{ chassis: c.id, color: PAINTS[CHASSIS.indexOf(c) % PAINTS.length].hex, expression: 'idle' }} />
                  <figcaption>
                    <b className="display">{c.name}</b>
                    <span className="mono">{c.code} · {c.id} · {c.optics}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </>
        ),
      },
      {
        title: 'The notched recess',
        body: (
          <p>
            When the status light sits directly above the visor and inside its width, the two share one machined recess, with the light in a notch. Otherwise the light gets its own pocket, as on Keyhole, Chamfer and Bloom.
          </p>
        ),
      },
    ],
  },
  {
    id: 'expressions',
    title: 'Expressions',
    group: 'Concepts',
    summary: `${EXPRESSIONS.length} moods built from lids, tilts and cheeks over LED eyes.`,
    unit: { chassis: 'capsule', color: '#e8603f', expression: 'suspicious' },
    sections: [
      {
        title: 'The set',
        body: (
          <div className="doc-exprs">
            {EXPRESSIONS.map((x) => (
              <figure key={x.id}>
                <EyeTile ex={x} glow="#46d6ff" pupils optics="dual" />
                <figcaption>
                  <b className="display">{x.name}</b>
                  <span className="mono">{x.code} · {x.id}</span>
                  <i>{x.note}</i>
                </figcaption>
              </figure>
            ))}
          </div>
        ),
      },
      {
        title: 'Eye parameters',
        body: (
          <>
            <p>
              Every expression sets the parameters below for each eye. Switching expression tweens every value, so moods melt into each other instead of snapping. Blinks squash the eye vertically.
            </p>
            <table className="doc-table">
              <thead><tr><th>Param</th><th>Range</th><th>Effect</th></tr></thead>
              <tbody>
                <tr><td><code>top</code></td><td>0–1</td><td>Upper lid coverage</td></tr>
                <tr><td><code>tilt</code></td><td>degrees</td><td>Lid angle. Positive drops the inner corner (angry), negative the outer (sad).</td></tr>
                <tr><td><code>bottom</code></td><td>0–1</td><td>Lower lid coverage</td></tr>
                <tr><td><code>cheek</code></td><td>0–1</td><td>A rising crescent that turns the eye into a smile</td></tr>
                <tr><td><code>sx</code>, <code>sy</code></td><td>scale</td><td>Eye width and height</td></tr>
                <tr><td><code>rx</code></td><td>0–0.5</td><td>Corner roundness. 0.5 is a circle.</td></tr>
                <tr><td><code>ps</code></td><td>scale</td><td>Pupil size. 0 hides the pupil.</td></tr>
                <tr><td><code>px</code>, <code>py</code></td><td>−1–1</td><td>Where the pupil rests, added to the gaze</td></tr>
              </tbody>
            </table>
          </>
        ),
      },
    ],
  },
  {
    id: 'display',
    title: 'Display & power',
    group: 'Concepts',
    summary: 'Display modes, optics, pupils, emitter colour and the three power bars.',
    unit: { chassis: 'dome', color: '#3657d8', screen: 'wave' },
    sections: [
      {
        title: 'Display modes',
        body: (
          <div className="doc-modes">
            {([['eyes', 'Eyes', 'The expression, with gaze and blinks.'], ['wave', 'Voice', 'A waveform for agents that are speaking.'], ['dots', 'Typing', 'Three bouncing dots while it composes.'], ['glyph', 'Glyph', 'A pixel robot icon on the dot matrix.']] as const).map(([screen, name, note]) => (
              <figure key={screen}>
                <Unit c={{ chassis: 'octa', color: '#d3d3cf', screen }} />
                <figcaption><b className="display">{name}</b><span className="mono">screen: "{screen}"</span><i>{note}</i></figcaption>
              </figure>
            ))}
          </div>
        ),
      },
      {
        title: 'Optics, pupils, emitter',
        body: (
          <>
            <p>
              <b>Optics</b> is <code>auto</code> (the chassis default), <code>mono</code> or <code>dual</code>. <b>Pupils</b> adds dark pupils that follow the gaze. <b>Emitter</b> sets the LED colour:
            </p>
            <div className="doc-glows">
              {GLOWS.map((g) => (
                <span key={g.hex} className="mono"><i style={{ background: g.hex, boxShadow: `0 0 10px ${g.hex}` }} />{g.name} {g.hex}</span>
              ))}
            </div>
          </>
        ),
      },
      {
        title: 'Power',
        body: (
          <table className="doc-table">
            <thead><tr><th>Bar</th><th>Field</th><th>Effect</th></tr></thead>
            <tbody>
              <tr><td>Core charge</td><td><code>charge</code></td><td>Glow radius and brightness of the eyes and status light. Below about 15% the eyes dim.</td></tr>
              <tr><td>Curiosity</td><td><code>curiosity</code></td><td>How far the eyes follow your cursor and how much they wander when idle. 0 stares straight ahead.</td></tr>
              <tr><td>Blink rate</td><td><code>blink</code></td><td>How often it blinks, with the occasional double blink. 0 never blinks.</td></tr>
            </tbody>
          </table>
        ),
      },
    ],
  },
  {
    id: 'json',
    title: 'Cog JSON',
    group: 'Reference',
    summary: 'The portable format: fields, values, validation and the ways in and out.',
    unit: { chassis: 'ticket', color: '#d3d3cf', expression: 'focused', screen: 'dots' },
    sections: [
      {
        title: 'Format',
        body: (
          <>
            <p>A cog is one flat JSON object. This is Flange, the house unit:</p>
            <Code lang="json" title="flange.json">{toJSON(LOGO)}</Code>
          </>
        ),
      },
      {
        title: 'Fields',
        body: (
          <table className="doc-table">
            <thead><tr><th>Field</th><th>Type</th><th>Values</th></tr></thead>
            <tbody>
              <tr><td><code>name</code></td><td>string</td><td>Up to 16 characters</td></tr>
              <tr><td><code>chassis</code></td><td>enum</td><td>{CHASSIS.map((c) => c.id).join(' · ')}</td></tr>
              <tr><td><code>expression</code></td><td>enum</td><td>{EXPRESSIONS.map((x) => x.id).join(' · ')}</td></tr>
              <tr><td><code>screen</code></td><td>enum</td><td>eyes · wave · dots · glyph</td></tr>
              <tr><td><code>optics</code></td><td>enum</td><td>auto · mono · dual</td></tr>
              <tr><td><code>color</code>, <code>glow</code></td><td>string</td><td><code>#rrggbb</code></td></tr>
              <tr><td><code>pupils</code></td><td>boolean</td><td>true · false</td></tr>
              <tr><td><code>charge</code>, <code>curiosity</code>, <code>blink</code></td><td>number</td><td>0 – 1</td></tr>
            </tbody>
          </table>
        ),
      },
      {
        title: 'Validation',
        body: (
          <ul className="doc-list">
            <li>JSON that won’t parse is rejected, with the parser’s message.</li>
            <li>An object needs at least one of <code>chassis</code>, <code>color</code> or <code>expression</code> to count as a cog.</li>
            <li>Every field is optional. Missing fields take the defaults.</li>
            <li>Unknown values, such as a misspelled chassis or a bad colour, fall back to the default and report a warning. Numbers are clamped to 0–1.</li>
            <li><code>$schema</code> and any unknown keys are ignored.</li>
          </ul>
        ),
      },
      {
        title: 'In and out',
        body: (
          <table className="doc-table">
            <tbody>
              <tr><td>Copy · Download</td><td>Panel 09 copies the JSON or saves <code>cog-name.json</code>.</td></tr>
              <tr><td>Edit</td><td>Edit in panel 09, then press <Kbd>⌘</Kbd> <Kbd>↵</Kbd> or Build.</td></tr>
              <tr><td>Paste</td><td>The Paste button, or <Kbd>⌘</Kbd> <Kbd>V</Kbd> anywhere outside a text field.</td></tr>
              <tr><td>Upload</td><td>The Upload button, or drop a <code>.json</code> file on the editor.</td></tr>
              <tr><td>URL</td><td>The studio keeps the cog in the hash as <code>#c=&lt;base64 JSON&gt;</code>, so any link reproduces it.</td></tr>
            </tbody>
          </table>
        ),
      },
    ],
  },
  {
    id: 'export',
    title: 'Export',
    group: 'Reference',
    summary: 'SVG, PNG and share links, and how to drop a cog into a README.',
    unit: { chassis: 'crest', color: '#ff6a2b', expression: 'wink' },
    sections: [
      {
        title: 'Formats',
        body: (
          <table className="doc-table">
            <tbody>
              <tr><td>SVG ↓</td><td>A self-contained 1024 × 1024 SVG with gradients, filters and the LED pattern inline. It scales without blurring.</td></tr>
              <tr><td>PNG ↓</td><td>The same SVG rasterized at 1024 px with a transparent background.</td></tr>
              <tr><td>Share ⧉</td><td>Copies a studio link with the cog in the URL hash.</td></tr>
            </tbody>
          </table>
        ),
      },
      {
        title: 'In a README',
        body: (
          <>
            <p>Commit the exported SVG and reference it like any image. GitHub renders the filters and glow.</p>
            <Code lang="html" title="README.md">{`<p align="center">
  <img src="cog-flange.svg" width="160" alt="Flange" />
</p>`}</Code>
          </>
        ),
      },
    ],
  },
  {
    id: 'extending',
    title: 'Extending',
    group: 'Reference',
    summary: 'Add a chassis or an expression, and re-render the logo.',
    unit: { chassis: 'bracket', color: '#72c97c', expression: 'skeptic' },
    sections: [
      {
        title: 'Add a chassis',
        body: (
          <>
            <p>
              Append to <code>CHASSIS</code> in <code>src/lib/chassis.ts</code>. <code>poly()</code> rounds a list of points for you. Keep the visor and light inside the outline, and the studio, docs and JSON validator pick it up automatically.
            </p>
            <Code lang="ts" title="src/lib/chassis.ts">{`poly('ticket', 'Ticket', 'CH-17', points, 14, {
  visor: { x: 100, y: 164, w: 200, h: 98, r: 47 },
  light: { x: 155, y: 132, w: 90, h: 12 },  // above the visor, so it's notched
  screws: [[72, 136], [328, 136], [72, 274], [328, 274]],
  optics: 'dual',
}),`}</Code>
          </>
        ),
      },
      {
        title: 'Add an expression',
        body: (
          <>
            <p>Append to <code>EXPRESSIONS</code> in <code>src/lib/expressions.ts</code>. Use <code>both()</code> for a symmetric face, or set <code>L</code> and <code>R</code> separately.</p>
            <Code lang="ts" title="src/lib/expressions.ts">{`both('smug', 'Smug', 'Told you so.', { top: 0.42, cheek: 0.3, tilt: -6, px: 0.4 }, 13),`}</Code>
          </>
        ),
      },
      {
        title: 'Re-render the logo',
        body: (
          <>
            <p>
              The house unit is <code>LOGO</code> in <code>src/lib/config.ts</code>. After changing it, render a static copy for the README and favicon:
            </p>
            <Code>{`bun run logo  # writes public/logo.svg`}</Code>
          </>
        ),
      },
    ],
  },
];
