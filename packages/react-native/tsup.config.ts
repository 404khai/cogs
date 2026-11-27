import { defineConfig } from 'tsup';

// One bundle for ESM and CJS. The shared logic is pulled in from app/src/lib, so the studio and the app draw the same cog.
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  // Hermes-friendly output.
  target: 'es2019',
  external: ['react', 'react-native', 'react-native-svg'],
});
