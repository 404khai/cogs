import { StrictMode, Suspense, lazy, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import 'allo-font/allo.css';
import '@fontsource-variable/jetbrains-mono';
import './index.css';
import App from './App.tsx';
import { useLinkInterception, usePath } from './lib/router';

const Docs = lazy(() => import('./docs/Docs'));
const Changelog = lazy(() => import('./changelog/Changelog'));

function Root() {
  useLinkInterception();
  const path = usePath().replace(/\/+$/, '') || '/';
  const page = path === '/changelog' ? 'changelog' : path === '/docs' || path.startsWith('/docs/') ? 'docs' : 'studio';

  useEffect(() => {
    document.title = page === 'studio' ? 'COGS — Avatar Studio' : page === 'docs' ? 'Cogs docs' : 'Cogs changelog';
  }, [page]);

  return (
    <Suspense fallback={<div className="route-loading mono">Loading…</div>}>
      {page === 'docs' ? <Docs path={path} /> : page === 'changelog' ? <Changelog /> : <App />}
    </Suspense>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
