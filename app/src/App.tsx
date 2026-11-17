import { useEffect, useState } from 'react';
import { Blueprint } from './components/Blueprint';
import { Studio } from './components/Studio';
import { Roster } from './components/Roster';
import { Footer, Nav } from './components/SiteChrome';
import { DEFAULT, decodeConfig, encodeConfig } from './lib/config';
import type { CogConfig } from './lib/config';
import { CHASSIS } from './lib/chassis';
import { EXPRESSIONS } from './lib/expressions';

function initial(): CogConfig {
  const m = location.hash.match(/c=([^&]+)/);
  return (m && decodeConfig(m[1])) || DEFAULT;
}

export default function App() {
  const [config, setConfig] = useState<CogConfig>(initial);

  useEffect(() => {
    const id = setTimeout(() => history.replaceState(null, '', `#c=${encodeConfig(config)}`), 250);
    return () => clearTimeout(id);
  }, [config]);

  return (
    <>
      <Blueprint />
      <Nav current="studio" power={config.charge} />

      <main>
        <section className="hero">
          <div>
            <span className="mono eyebrow">Avatar foundry · Rev A · 2026</span>
            <h1 className="display headline">
              Every machine
              <br />
              deserves a <em>face.</em>
            </h1>
          </div>
          <div className="hero-side">
            <p>
              Cogs is a bench for building agent avatars. Pick a chassis, tune the optics, set the mood, then ship it as a crisp SVG. The eyes follow your cursor.
            </p>
            <ul className="stats mono">
              <li><b>{String(CHASSIS.length).padStart(2, '0')}</b>Chassis</li>
              <li><b>{String(EXPRESSIONS.length).padStart(2, '0')}</b>Expressions</li>
              <li><b>04</b>Displays</li>
              <li><b>∞</b>Units</li>
            </ul>
          </div>
        </section>

        <Studio config={config} setConfig={setConfig} />

        <Roster
          onLoad={(c) => {
            setConfig({ ...c });
            document.getElementById('studio')?.scrollIntoView({ behavior: 'smooth' });
          }}
        />

      </main>
      <Footer />
    </>
  );
}
