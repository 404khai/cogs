import { defineConfig } from 'tsup';

// One bundle for ESM and CJS. The renderer is pulled in from app/src, so the studio and the package draw the same cog.
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'es2020',
  external: ['react', 'react-dom'],
  // Hooks run in the browser: mark the bundle as a client module for React Server Components (Next.js app router).
  banner: { js: "'use client';" },
});
