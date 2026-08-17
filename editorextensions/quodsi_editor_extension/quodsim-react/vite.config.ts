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
})
