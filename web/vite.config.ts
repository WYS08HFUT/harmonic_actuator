import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so the built folder can be dropped on any static host / CDN
  // path without rewriting asset URLs.
  base: './',
  server: { port: 5173 },
  build: {
    target: 'es2022',
    // three.js is the single large vendor dependency (~700 kB minified).
    chunkSizeWarningLimit: 800,
  },
});
