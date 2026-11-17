import { LOGO } from '../lib/config';
import { GH, PORTFOLIO, VERSION } from '../lib/site';
import { Cog } from './Cog';
import { EnergyBar } from './ui';
import { Gearworks } from './Gearworks';

type Page = 'studio' | 'docs' | 'changelog';

export function Logo({ className = 'logo-mark' }: { className?: string }) {
  return (
    <span className={className} aria-hidden="true">
      <Cog config={LOGO} />
    </span>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
      />
    </svg>
  );
}

export function Nav({ current, power }: { current: Page; power?: number }) {
  const home = current === 'studio' ? '' : '/';
  const links: [string, string, Page | null][] = [
    ['Studio', `${home}#studio`, 'studio'],
    ['Roster', `${home}#roster`, null],
    ['Docs', '/docs', 'docs'],
    ['Changelog', '/changelog', 'changelog'],
  ];
  return (
    <header className="topbar">
      <a className="brand" href={current === 'studio' ? '#studio' : '/'}>
        <Logo />
        <span className="display wordmark">cogs</span>
        <span className="mono crumb">/ {current === 'studio' ? 'avatar studio' : current}</span>
      </a>
      <nav className="mono">
        {links.map(([label, href, page]) => (
          <a key={label} href={href} aria-current={page === current ? 'page' : undefined}>
            {label}
          </a>
        ))}
      </nav>
      <div className="topbar-right">
        {power !== undefined && (
          <div className="pwr">
            <EnergyBar label="PWR" value={power} segments={12} />
          </div>
        )}
        <span className="status mono">
          <i />
          Sys nominal
        </span>
        <a className="gh-link" href={GH} aria-label="Cogs on GitHub">
          <GitHubIcon />
        </a>
      </div>
    </header>
  );
}

const COLUMNS: { title: string; links: [string, string][] }[] = [
  { title: 'Product', links: [['Studio', '/#studio'], ['Roster', '/#roster'], ['Cog JSON', '/docs/json'], ['Chassis', '/docs/chassis']] },
  { title: 'Resources', links: [['Docs', '/docs'], ['Changelog', '/changelog'], ['Expressions', '/docs/expressions'], ['Extending', '/docs/extending']] },
  { title: 'Community', links: [['GitHub', GH], ['Issues', `${GH}/issues`], ['Releases', `${GH}/releases`], ['404khai', PORTFOLIO]] },
];

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-line">
        <div className="footer-line-head">
          <span className="mono idx">§ 03</span>
          <h2 className="display">The line never stops.</h2>
          <p>Every unit is pressed, painted and checked before it ships. Hover the floor: they'll look up.</p>
        </div>
        <Gearworks />
      </div>

      <div className="footer-links">
        <p className="footer-tag display">
          Faces for the machines
          <br />
          that do the work.
        </p>
        {COLUMNS.map((c) => (
          <div key={c.title}>
            <span className="mono">{c.title}</span>
            {c.links.map(([label, href]) => (
              <a key={label} href={href}>
                {label}
              </a>
            ))}
          </div>
        ))}
      </div>

      <div className="titleblock" id="specs">
        <div className="tb-big display">cogs</div>
        <dl className="tb-grid mono">
          <div><dt>Project</dt><dd>Avatar Foundry</dd></div>
          <div><dt>Drawn</dt><dd>Cogs Studio</dd></div>
          <div><dt>Scale</dt><dd>1 : 1 (SVG)</dd></div>
          <div><dt>Builder</dt><dd><a href={PORTFOLIO}>404khai ↗</a></dd></div>
          <div><dt>Type</dt><dd>Allo · JetBrains Mono</dd></div>
          <div><dt>Material</dt><dd>Anodised alloy</dd></div>
          <div><dt>Sheet</dt><dd>01 / 01 · Rev A</dd></div>
          <div><dt>Source</dt><dd><a href={GH}>404khai/cogs ↗</a></dd></div>
        </dl>
      </div>

      <div className="footer-bar mono">
        <span>
          © 2026 built by <a className="footer-author" href={PORTFOLIO}>404khai</a>
        </span>
        <span className="badges">
          <a className="badge-live" href="/changelog">
            <i aria-hidden="true"><b /><b /><b /></i> v{VERSION} live now
          </a>
          <span className="badge-plain">Pure SVG avatars</span>
        </span>
      </div>
    </footer>
  );
}
