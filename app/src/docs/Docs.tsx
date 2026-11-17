import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './docs.css';
import { Blueprint } from '../components/Blueprint';
import { Cog } from '../components/Cog';
import { Footer, Logo } from '../components/SiteChrome';
import { Corners } from '../components/ui';
import { DEFAULT } from '../lib/config';
import { navigate } from '../lib/router';
import { GH, PORTFOLIO, VERSION } from '../lib/site';
import { PAGES } from './content';
import type { DocPage } from './content';
import { BounceList, GearDial, ScrollRuler } from './DocsKit';

const ROUTES = [{ id: 'overview', title: 'Overview' }, ...PAGES.map((p) => ({ id: p.id, title: p.title }))];
const TABS = [
  { label: 'Documentation', id: 'overview' },
  { label: 'Chassis', id: 'chassis' },
  { label: 'Expressions', id: 'expressions' },
  { label: 'Cog JSON', id: 'json' },
];
const hrefOf = (id: string) => (id === 'overview' ? '/docs' : `/docs/${id}`);

function Overview() {
  return (
    <>
      <section className="doc-banner" data-section-index={0}>
        <Corners />
        <div className="doc-banner-copy">
          <span className="mono eyebrow">Cogs / Docs</span>
          <h1 className="display">Cogs documentation</h1>
          <p>
            Cogs builds avatars for agents: machined plates with LED eyes that follow you, blink and change mood. This manual covers the bench, every part, the JSON format and how to add your own. Pick a spoke, or just scroll.
          </p>
          <span className="mono doc-ver">v{VERSION} · {PAGES.length} pages</span>
        </div>
        <GearDial
          links={[
            { deg: 0, label: 'Quickstart', href: '/docs/quickstart' },
            { deg: 90, label: 'Chassis', href: '/docs/chassis' },
            { deg: 180, label: 'JSON', href: '/docs/json' },
            { deg: 270, label: 'Moods', href: '/docs/expressions' },
          ]}
        />
      </section>

      <section className="doc-section" data-section-index={1}>
        <span className="mono eyebrow">Start here</span>
        <div className="doc-grid">
          {PAGES.map((p, i) => (
            <a key={p.id} className="doc-tile" href={hrefOf(p.id)}>
              <div className="doc-tile-stage">
                <span className="mono doc-tile-n">{String(i + 1).padStart(2, '0')}</span>
                <span className="doc-tile-cog">
                  <Cog config={{ ...DEFAULT, ...p.unit }} />
                </span>
              </div>
              <div className="doc-tile-copy">
                <span className="mono">{p.group}</span>
                <b className="display">{p.title}</b>
                <span>{p.summary}</span>
              </div>
            </a>
          ))}
        </div>
      </section>
    </>
  );
}

const slug = (s: string) => s.toLowerCase().replace(/\W+/g, '-');

function Page({ page }: { page: DocPage }) {
  const next = PAGES[PAGES.indexOf(page) + 1];
  return (
    <>
      <header className="doc-page-head">
        <span className="doc-page-cog" aria-hidden="true">
          <Cog config={{ ...DEFAULT, ...page.unit }} />
        </span>
        <span className="mono eyebrow">{page.group}</span>
        <h1 className="display">{page.title}</h1>
        <p>{page.summary}</p>
      </header>
      {page.sections.map((s, i) => (
        <section key={s.title} className="doc-section doc-prose" data-section-index={i} id={slug(s.title)}>
          <h2 className="display">
            <span className="mono">{String(i + 1).padStart(2, '0')}</span>
            {s.title}
          </h2>
          {s.body}
        </section>
      ))}
      {next && (
        <a className="doc-next" href={hrefOf(next.id)}>
          <span className="mono">Next</span>
          <b className="display">{next.title} →</b>
        </a>
      )}
    </>
  );
}

function Search({ onGo }: { onGo: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    input.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const t = trigger.current;
    return () => {
      document.body.style.overflow = prev;
      t?.focus();
    };
  }, [open]);

  const hits = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return PAGES;
    return PAGES.filter((p) => [p.title, p.summary, p.group, ...p.sections.map((s) => s.title)].join(' ').toLowerCase().includes(term));
  }, [q]);

  const close = () => {
    setOpen(false);
    setQ('');
    setSel(0);
  };
  const go = (id: string) => {
    onGo(id);
    close();
  };

  return (
    <>
      <button ref={trigger} className="doc-search" onClick={() => setOpen(true)} aria-haspopup="dialog">
        <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="9" cy="9" r="6" /><path d="m14 14 4 4" /></svg>
        <span>Search…</span>
        <kbd>⌘K</kbd>
      </button>
      {open &&
        createPortal(
          <div className="search-overlay" onMouseDown={(e) => e.target === e.currentTarget && close()}>
            <div className="search-dialog" role="dialog" aria-modal="true" aria-label="Search the docs">
              <span className="sd-cog" aria-hidden="true">
                <Cog config={{ ...DEFAULT, chassis: 'hex', color: '#9d8df0', expression: hits.length ? 'lookup' : 'sad' }} />
              </span>
              <div className="search-box">
                <Corners />
                <div className="search-field">
                  <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="9" cy="9" r="6" /><path d="m14 14 4 4" /></svg>
                  <input
                    ref={input}
                    value={q}
                    onChange={(e) => {
                      setQ(e.target.value);
                      setSel(0);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') close();
                      else if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setSel((i) => Math.min(i + 1, hits.length - 1));
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setSel((i) => Math.max(i - 1, 0));
                      } else if (e.key === 'Enter' && hits[sel]) go(hits[sel].id);
                    }}
                    placeholder="Search the docs…"
                    aria-label="Search the docs"
                    aria-controls="search-results"
                    aria-activedescendant={hits[sel] ? `hit-${hits[sel].id}` : undefined}
                  />
                  <kbd>esc</kbd>
                </div>
                <ul className="search-results" id="search-results" role="listbox">
                  {hits.length ? (
                    hits.map((h, i) => (
                      <li key={h.id} id={`hit-${h.id}`} role="option" aria-selected={i === sel}>
                        <button onMouseEnter={() => setSel(i)} onClick={() => go(h.id)}>
                          <span className="mono hit-group">{h.group}</span>
                          <b className="display">{h.title}</b>
                          <span className="hit-summary">{h.summary}</span>
                        </button>
                      </li>
                    ))
                  ) : (
                    <li className="empty">Nothing matches “{q}”.</li>
                  )}
                </ul>
                <div className="search-foot mono">
                  <span>↑↓ to move</span>
                  <span>↵ to open</span>
                  <span>esc to close</span>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

export default function Docs({ path }: { path: string }) {
  const id = path.split('/')[2] ?? 'overview';
  const route = ROUTES.some((r) => r.id === id) ? id : 'overview';
  const [menu, setMenu] = useState(false);
  const page = PAGES.find((p) => p.id === route);
  const sections = page ? page.sections.map((s) => s.title) : ['Overview', 'Start here'];
  const index = ROUTES.findIndex((r) => r.id === route);
  const go = (to: string) => {
    setMenu(false);
    navigate(hrefOf(to));
  };

  useEffect(() => setMenu(false), [route]);

  return (
    <>
      <Blueprint />
      <div className="docs">
        <aside className={`docs-side${menu ? ' open' : ''}`}>
          <div className="docs-side-top">
            <a className="docs-brand" href="/">
              <Logo className="docs-brand-logo" />
              <span className="display">cogs</span>
              <small className="mono">Docs</small>
            </a>
            <button className="docs-menu" aria-expanded={menu} aria-label="Docs menu" onClick={() => setMenu((m) => !m)}>
              <span />
              <span />
            </button>
          </div>
          <div className="docs-side-body">
            <Search onGo={go} />
            <BounceList items={ROUTES.map((r) => r.title)} value={index} onChange={(i) => go(ROUTES[i].id)} />
            <nav className="docs-out mono">
              <a href="/">Studio</a>
              <a href="/changelog">Changelog</a>
              <a href={GH}>GitHub ↗</a>
              <a href={PORTFOLIO}>Built by 404khai ↗</a>
            </nav>
          </div>
        </aside>

        <div className="docs-body">
          <nav className="docs-tabs mono" aria-label="Docs sections">
            {TABS.map((t) => (
              <a key={t.id} href={hrefOf(t.id)} aria-current={route === t.id ? 'page' : undefined}>
                {t.label}
              </a>
            ))}
          </nav>
          <main className="docs-main" key={route}>
            {page ? <Page page={page} /> : <Overview />}
          </main>
        </div>

        <aside className="docs-rail" aria-label="On this page">
          <ScrollRuler key={route} sections={sections} />
        </aside>
      </div>
      <Footer />
    </>
  );
}
