import { useState, useSyncExternalStore } from 'react';
import './install.css';

/* ── Packages: one per platform ────────────────────────── */
export type Platform = 'react' | 'react-native' | 'flutter';
/** `pkg` is everything the command installs: the package plus any peers the app won't already have. */
const PACKAGES: { id: Platform; label: string; pkg: string }[] = [
  { id: 'react', label: 'React', pkg: '@cogs/react' },
  { id: 'react-native', label: 'React Native', pkg: '@cogs/react-native react-native-svg' },
  { id: 'flutter', label: 'Flutter', pkg: 'cogs' },
];

/* ── The package manager, shared by every switcher on the page and remembered ── */
type Manager = 'bun' | 'npm' | 'pnpm';
const MANAGERS: Manager[] = ['bun', 'npm', 'pnpm'];
const VERB: Record<Manager, string> = { bun: 'add', npm: 'install', pnpm: 'add' };
const KEY = 'cogs.pm';

const listeners = new Set<() => void>();
let current: Manager = (() => {
  try {
    const v = localStorage.getItem(KEY);
    return MANAGERS.includes(v as Manager) ? (v as Manager) : 'bun';
  } catch {
    return 'bun';
  }
})();
const setManager = (m: Manager) => {
  current = m;
  try {
    localStorage.setItem(KEY, m);
  } catch {
    /* private mode: remember for this page only */
  }
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => (listeners.add(l), () => void listeners.delete(l));
const useManager = () => useSyncExternalStore(subscribe, () => current);

const installCommand = (platform: Platform, m: Manager = 'bun') => {
  const { pkg } = PACKAGES.find((p) => p.id === platform)!;
  return platform === 'flutter' ? `flutter pub add ${pkg}` : `${m} ${VERB[m]} ${pkg}`;
};

/** An install command with bun / npm / pnpm tabs and a copy button. Flutter gets its one command. */
export function InstallTabs({ platform, className = '' }: { platform: Platform; className?: string }) {
  const manager = useManager();
  const [copied, setCopied] = useState(false);
  const pub = platform === 'flutter';
  const cmd = installCommand(platform, manager);
  const copy = () =>
    navigator.clipboard?.writeText(cmd).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    });

  return (
    <figure className={`install ${className}`}>
      <figcaption className="mono">
        {pub ? (
          <span className="install-tab active">flutter</span>
        ) : (
          <div className="install-tabs" role="tablist" aria-label="Package manager">
            {MANAGERS.map((m) => (
              <button key={m} type="button" role="tab" aria-selected={m === manager} className={`install-tab ${m === manager ? 'active' : ''}`} onClick={() => setManager(m)}>
                {m}
              </button>
            ))}
          </div>
        )}
        <button type="button" className="install-copy mono" onClick={copy} aria-label={`Copy ${cmd}`}>
          {copied ? 'Copied' : 'Copy'}
        </button>
      </figcaption>
      <pre>
        <code>
          <span className="tok-prompt">$ </span>
          {cmd}
        </code>
      </pre>
    </figure>
  );
}

/** All three platforms: pick one, then a package manager. */
export function Install({ className = '' }: { className?: string }) {
  const [platform, setPlatform] = useState<Platform>('react');
  return (
    <div className={`install-picker ${className}`}>
      <div className="install-platforms" role="radiogroup" aria-label="Platform">
        {PACKAGES.map((p) => (
          <button key={p.id} type="button" role="radio" aria-checked={p.id === platform} className={`mono ${p.id === platform ? 'active' : ''}`} onClick={() => setPlatform(p.id)}>
            {p.label}
          </button>
        ))}
      </div>
      <InstallTabs platform={platform} />
    </div>
  );
}
