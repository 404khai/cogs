import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { gearPoints, roundedPoly } from '../lib/chassis';
import { LOGO } from '../lib/config';
import { Cog } from '../components/Cog';

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Sidebar list whose marker hops between items in a little arc, like a part on a cam. */
export function BounceList({ items, value, onChange }: { items: string[]; value: number; onChange: (i: number) => void }) {
  const dot = useRef<HTMLSpanElement>(null);
  const refs = useRef<(HTMLLIElement | null)[]>([]);
  const prev = useRef<number | null>(null);
  const yOf = (i: number) => {
    const el = refs.current[i];
    return el ? el.offsetTop + el.offsetHeight / 2 - 4 : null;
  };

  useEffect(() => {
    const el = dot.current;
    const to = yOf(value);
    if (!el || to === null) return;
    const from = prev.current;
    prev.current = to;
    el.style.transform = `translate(0, ${to}px) rotate(45deg)`;
    if (from === null || from === to || reduced()) return;
    const peak = -Math.min(18, Math.abs(to - from) * 0.4);
    el.animate(
      [
        { transform: `translate(0, ${from}px) rotate(45deg)` },
        { transform: `translate(${peak}px, ${from + (to - from) * 0.6}px) rotate(225deg)`, offset: 0.45 },
        { transform: `translate(0, ${to}px) rotate(405deg)` },
      ],
      { duration: 480, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
    );
  }, [value]);

  useEffect(() => {
    const snap = () => {
      const to = yOf(value);
      if (to !== null && dot.current) {
        dot.current.style.transform = `translate(0, ${to}px) rotate(45deg)`;
        prev.current = to;
      }
    };
    document.fonts?.ready.then(snap);
    window.addEventListener('resize', snap);
    return () => window.removeEventListener('resize', snap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onKey = (e: KeyboardEvent<HTMLUListElement>) => {
    const n = items.length;
    const next = e.key === 'ArrowDown' ? (value + 1) % n : e.key === 'ArrowUp' ? (value - 1 + n) % n : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : -1;
    if (next < 0) return;
    e.preventDefault();
    onChange(next);
    refs.current[next]?.querySelector('button')?.focus();
  };

  return (
    <ul className="bounce-list" role="listbox" aria-label="Docs pages" onKeyDown={onKey}>
      <span ref={dot} className="bounce-dot" aria-hidden="true" />
      {items.map((item, i) => (
        <li key={item} ref={(el) => void (refs.current[i] = el)}>
          <button type="button" role="option" aria-selected={i === value} tabIndex={i === value ? 0 : -1} onClick={() => onChange(i)}>
            <span className="mono">{String(i).padStart(2, '0')}</span>
            {item}
          </button>
        </li>
      ))}
    </ul>
  );
}

/** Right rail: a ruler of ticks with section marks; the marker follows the scroll position. */
export function ScrollRuler({ sections }: { sections: string[] }) {
  const track = useRef<HTMLDivElement>(null);
  const [h, setH] = useState(0);
  const [active, setActive] = useState(0);
  const ticks = 61;
  const last = ticks - 1;
  const y = (t: number) => (t / last) * h;
  const markTick = (i: number) => Math.round((i / Math.max(sections.length - 1, 1)) * last);

  useEffect(() => {
    const measure = () => setH(track.current?.clientHeight ?? 0);
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  useEffect(() => {
    const onScroll = () => {
      let cur = 0;
      document.querySelectorAll<HTMLElement>('[data-section-index]').forEach((el, i) => {
        if (el.getBoundingClientRect().top < innerHeight * 0.35) cur = i;
      });
      if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) cur = sections.length - 1;
      setActive(cur);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [sections]);

  const go = (i: number) => {
    const el = document.querySelector(`[data-section-index="${i}"]`);
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - 32, behavior: reduced() ? 'auto' : 'smooth' });
  };

  return (
    <div ref={track} className="ruler-rail">
      {Array.from({ length: ticks }, (_, t) => (
        <i key={t} className={`rr-tick ${t % 5 === 0 ? 'major' : ''} ${t <= markTick(active) ? 'past' : ''}`} style={{ top: y(t) }} />
      ))}
      {sections.map((s, i) => (
        <button key={s} type="button" className={`rr-label ${i === active ? 'active' : ''}`} style={{ top: y(markTick(i)) - 8, transitionDelay: `${i * 30}ms` }} onClick={() => go(i)}>
          {s}
        </button>
      ))}
      <div className="rr-marker" style={{ transform: `translateY(${y(markTick(active))}px)` }}>
        <i />
        <span className="mono">{sections.length ? `${active + 1}/${sections.length}` : '0/0'}</span>
      </div>
    </div>
  );
}

/** Overview dial: a slow gear with Flange at the hub and four destinations around the rim. */
export function GearDial({ links }: { links: { deg: number; label: string; href: string }[] }) {
  const [near, setNear] = useState<number | null>(null);
  const outer = roundedPoly(gearPoints(200, 200, 24, 150, 166), 2);
  return (
    <div className="gear-dial">
      <svg viewBox="0 0 400 400" aria-hidden="true">
        <circle cx="200" cy="200" r="190" className="gd-ring faint" />
        <g className="gd-spin">
          <path d={outer} className="gd-gear" />
          <circle cx="200" cy="200" r="132" className="gd-ring" />
          {Array.from({ length: 72 }, (_, i) => {
            const a = (i / 72) * Math.PI * 2;
            const r0 = i % 6 === 0 ? 116 : 124;
            return <line key={i} x1={200 + Math.cos(a) * r0} y1={200 + Math.sin(a) * r0} x2={200 + Math.cos(a) * 130} y2={200 + Math.sin(a) * 130} className={`gd-tick ${i % 6 === 0 ? 'major' : ''}`} />;
          })}
        </g>
        {links.map((l, i) => {
          const a = ((l.deg - 90) * Math.PI) / 180;
          return (
            <line key={l.label} x1={200 + Math.cos(a) * 104} y1={200 + Math.sin(a) * 104} x2={200 + Math.cos(a) * 176} y2={200 + Math.sin(a) * 176} className={`gd-spoke ${near === i ? 'on' : ''}`} />
          );
        })}
      </svg>
      <div className="gd-hub">
        <Cog config={{ ...LOGO, expression: near === null ? 'suspicious' : 'happy', curiosity: 1 }} />
      </div>
      {links.map((l, i) => {
        const a = ((l.deg - 90) * Math.PI) / 180;
        return (
          <a
            key={l.label}
            href={l.href}
            className={`gd-link display ${near === i ? 'on' : ''}`}
            style={{ left: `${50 + Math.cos(a) * 47}%`, top: `${50 + Math.sin(a) * 47}%` }}
            onPointerEnter={() => setNear(i)}
            onPointerLeave={() => setNear(null)}
            onFocus={() => setNear(i)}
            onBlur={() => setNear(null)}
          >
            {l.label}
          </a>
        );
      })}
    </div>
  );
}
