import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The Lucid extension serves this app from public/quodsim-react/ inside the
// package zip, never from a server root. `base: './'` is therefore load-bearing,
// not cosmetic - it is the same failure Lucid's own docs call out for Angular
// ("remove the line <base href="/">"). With it, Vite emits relative asset paths
// and the (src|href)="/" rewrite in the extension's webpack.config.js becomes a
// harmless no-op instead of a load-bearing patch.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    // The extension's webpack hook and both deploy scripts copy from `build/`,
    // which is CRA's default. Keeping the name means Task 7 changes the build
    // COMMAND only, not every path that consumes its output.
    outDir: 'build',
    emptyOutDir: true,
  },
  // @quodsi/lucid-shared is a LINKED (file:) dependency that compiles to
  // CommonJS (its tsconfig sets module: "commonjs"). Vite does not pre-bundle
  // linked deps by default, so without this the dev server hands raw CJS to
  // the browser as ESM and every named import (SimulationStatus, ModelDefaults,
  // ...) resolves to nothing - a completely blank page. Production is immune
  // because rolldown converts CJS to ESM at build time, which is exactly why
  // this only ever broke dev.
  optimizeDeps: {
    // @quodsi/lucid-shared is a LINKED (file:) dependency compiling to
    // CommonJS; without pre-bundling, the dev server hands raw CJS to the
    // browser as ESM and every named import resolves to nothing (blank page).
    include: [
      '@quodsi/lucid-shared',
      // Heavy node_modules deps reached ONLY through the excluded
      // quodsi_studio source. Without this, Vite discovers them on demand the
      // first time a panel using them renders and does a full-page reload
      // ("optimized dependencies changed. reloading"). Front-loading them to
      // server boot avoids that mid-session reload. Mirrors quodsi_drawio.
      '@dnd-kit/core',
      '@dnd-kit/sortable',
      '@dnd-kit/utilities',
    ],
    // quodsi_studio's exports point at .tsx SOURCE -- pre-bundling those
    // breaks source maps and HMR. Resolve them on demand instead.
    exclude: ['quodsi_studio'],
  },
  server: {
    // The extension's onWatchRun hook fetches http://localhost:3000 and writes
    // the result into public/quodsim-react/index.html. Both the port and the
    // strictness matter: a silent fallback to 3001 makes the hook fetch nothing.
    port: 3000,
    strictPort: true,
    // Lucid serves the rewritten index.html from ITS origin while assets and
    // HMR come from localhost:3000, so every dev-mode request is cross-origin.
    cors: true,
    // Emit absolute dev asset URLs so they survive being written into a page
    // served from another origin.
    origin: 'http://localhost:3000',
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    // Scope collection to actual test files. scripts/dev-smoke.mjs imports
    // playwright by absolute file URL and is not a Vitest test - the default
    // include glob would otherwise try to collect it.
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
})
