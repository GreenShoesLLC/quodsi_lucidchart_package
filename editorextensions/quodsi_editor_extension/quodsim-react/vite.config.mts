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
  resolve: {
    // quodsi_studio is a symlinked (file:) dependency; its own bare `react`
    // imports otherwise resolve past the symlink to its real path's node_modules
    // (the monorepo root) instead of this package's node_modules. The production
    // build already dedupes this correctly on its own; Vitest's SSR-style module
    // resolution does not, producing a second physical React module instance and
    // a null-dispatcher "Invalid hook call" the moment GeneratorPatternTab
    // actually renders. Force both resolutions to the same copy everywhere.
    // lucide-react added (Task 5, routing-tab adoption): quodsi_studio's
    // ConnectorRoutingView pulls in InfoIcon/LeverAuthoringSection, the
    // first Studio panels to use lucide-react icons themselves (earlier
    // Studio imports here -- RequirementField -- never rendered one). Same
    // duplicate-module class as react/react-dom above: this package's own
    // node_modules/lucide-react and the monorepo root's are two distinct
    // physical copies, each internally calling React's createContext/
    // useContext against whichever "react" IT resolves -- without dedupe
    // here too, that produced a null dispatcher ("Cannot read properties of
    // null (reading 'useContext')") only under Vitest's SSR-style
    // resolution, the moment ConnectorRoutingView actually rendered.
    //
    // VERSION SKEW -- this dedupe also applies to `vite build` (not just
    // Vitest), so it changes the shipped production bundle, not just tests.
    // Dedupe resolves every `lucide-react` import to the copy nearest the
    // Vite root, i.e. THIS package's node_modules/lucide-react (0.468.0) --
    // NOT the monorepo root's copy (1.16.0) that quodsi_studio's own
    // tsc/vitest normally compile/test against. Studio's shared panels
    // therefore compile into the Lucid bundle against 0.468.0, a silent
    // major-version downgrade from what Studio itself ships with. Verified
    // safe as of Task 5 (`npm run build` succeeds; every icon the shared
    // Studio layer imports -- InfoIcon's Info, LeverAuthoringSection's
    // icons, etc. -- exists in 0.468.0). This is NOT guaranteed going
    // forward -- the next Studio panel pulled into quodsim-react that
    // imports an icon added to lucide-react after 0.468.0 will resolve to
    // `undefined` at render time (lucide-react has no build-time
    // export-existence check), not a build error. If that happens: bump
    // this package's own lucide-react dependency to cover the icon, or
    // avoid the offending icon in the Studio panel being adopted.
    dedupe: ['react', 'react-dom', 'lucide-react'],
  },
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
    include: [
      '@quodsi/lucid-shared',
      // Pre-bundled so Vite front-loads them at server boot instead of
      // discovering them mid-session and forcing a full-page reload
      // ("optimized dependencies changed. reloading"). All three are used by
      // quodsim-react's own ActivityEditor.tsx AND by Studio's imported
      // panels. Note @dnd-kit/utilities is used but NOT declared in
      // package.json -- it resolves only as a transitive dep of core and
      // sortable. Pre-existing; listing it here does not fix that.
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
