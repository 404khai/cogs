import { useEffect, useRef, useState } from 'react';
import { parseCog, toJSON } from '../lib/config';
import type { CogConfig } from '../lib/config';
import { Corners, PanelHead } from './ui';

type Props = {
  config: CogConfig;
  onBuild: (c: CogConfig) => void;
  onLog: (msg: string) => void;
  download: (blob: Blob, name: string) => void;
};

/** Editable JSON source for the current cog: copy, download, paste or upload to rebuild. */
export function JsonPanel({ config, onBuild, onLog, download }: Props) {
  const current = toJSON(config);
  const [text, setText] = useState(current);
  const [dirty, setDirty] = useState(false);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Follow the studio while the user isn't editing.
  useEffect(() => {
    if (!dirty) setText(current);
  }, [current, dirty]);

  const result = dirty ? parseCog(text) : null;
  const error = result && 'error' in result ? result.error : null;
  const warnings = result && 'config' in result ? result.warnings : [];

  const build = (source = text, from = 'editor') => {
    const res = parseCog(source);
    if ('error' in res) {
      setText(source);
      setDirty(true);
      onLog(`json rejected (${from})`);
      return;
    }
    onBuild(res.config);
    setDirty(false);
    onLog(`built ${res.config.name.toLowerCase()} from ${from}${res.warnings.length ? ` · ${res.warnings.length} warning(s)` : ''}`);
  };

  const readFile = async (file: File) => build(await file.text(), file.name);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(current);
      onLog('json copied');
    } catch {
      onLog('clipboard unavailable');
    }
  };

  const pasteFromClipboard = async () => {
    try {
      build(await navigator.clipboard.readText(), 'clipboard');
    } catch {
      onLog('clipboard read blocked: paste into the editor');
    }
  };

  const lines = text.split('\n').length;

  return (
    <div className="panel json-panel">
      <Corners />
      <PanelHead
        index="09"
        title="SOURCE · JSON"
        aside={
          error ? <span className="json-bad">✕ invalid</span> : dirty ? <span className="json-edit">● unsaved edits</span> : <span className="json-ok">✓ in sync</span>
        }
      />
      <div
        className={`json-editor ${drag ? 'drag' : ''} ${error ? 'bad' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const f = e.dataTransfer.files[0];
          if (f) readFile(f);
          else build(e.dataTransfer.getData('text'), 'drop');
        }}
      >
        <div className="json-gutter mono" aria-hidden="true">
          {Array.from({ length: lines }, (_, i) => (
            <span key={i}>{i + 1}</span>
          ))}
        </div>
        <textarea
          value={text}
          spellCheck={false}
          aria-label="Cog JSON"
          rows={lines}
          onChange={(e) => {
            setText(e.target.value);
            setDirty(e.target.value !== current);
          }}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
              e.preventDefault();
              build();
            }
          }}
        />
        {drag && <div className="json-drop mono">Drop .json to build</div>}
      </div>
      {(error || warnings.length > 0) && (
        <ul className="json-msgs mono">
          {error && <li className="bad">{error}</li>}
          {warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}
      <div className="json-actions">
        <button className="btn primary" onClick={() => build()} disabled={!dirty || !!error}>
          <span>Build</span>
          <kbd>⌘↵</kbd>
        </button>
        {dirty && (
          <button className="btn" onClick={() => setDirty(false)}>
            Revert
          </button>
        )}
        <span className="spacer" />
        <button className="btn" onClick={copy}>Copy</button>
        <button className="btn" onClick={() => download(new Blob([current], { type: 'application/json' }), `cog-${config.name.toLowerCase() || 'unit'}.json`)}>
          .json ↓
        </button>
        <button className="btn" onClick={pasteFromClipboard}>Paste</button>
        <button className="btn" onClick={() => fileRef.current?.click()}>Upload</button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) readFile(f);
            e.target.value = '';
          }}
        />
      </div>
      <p className="json-tip mono">Tip: paste cog JSON anywhere on the page to build it.</p>
    </div>
  );
}
