import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// One app, client-side routes: /, /docs, /docs/:page, /changelog.
// The dev server falls back to index.html for those paths; vercel.json does the same in production.
export default defineConfig({
  plugins: [react()],
});
