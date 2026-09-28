import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Stamp the service worker with the build time so each deploy gets a fresh cache.
function stampServiceWorker() {
  return {
    name: 'stamp-service-worker',
    apply: 'build',
    closeBundle() {
      const file = resolve(__dirname, 'dist/sw.js');
      if (!existsSync(file)) return;
      writeFileSync(file, readFileSync(file, 'utf8').replaceAll('__BUILD__', Date.now().toString(36)));
    },
  };
}

// The production build is one self-contained index.html (fonts, scripts and
// styles inlined) so it runs by double-clicking, with no server and no internet.
// Files in public/ (icons, manifest, service worker) are copied next to it for web deploys.
export default defineConfig({
  base: './',
  plugins: [viteSingleFile(), stampServiceWorker()],
  build: {
    target: 'es2020',
    assetsInlineLimit: 100_000_000,
    chunkSizeWarningLimit: 2000,
  },
  test: {
    include: ['tests/**/*.test.js'],
  },
});
