import { defineConfig } from 'vite'

/**
 * The MuseScore plugin's engine bundle. One IIFE, one global (`woodshed`),
 * ES2016 for Qt 6.10's QJSEngine, unminified so a stack trace in
 * MuseScore's console names a function. `plugin/Woodshed.qml` imports it.
 */
export default defineConfig({
  // Vite copies publicDir into outDir on every build by default; this
  // build's outDir is plugin/, and public/ (the browser app's own assets,
  // including public/solos) has nothing to do with the plugin bundle.
  publicDir: false,
  build: {
    lib: {
      entry: 'plugin/entry.ts',
      name: 'woodshed',
      formats: ['iife'],
      fileName: () => 'woodshed.js',
    },
    outDir: 'plugin',
    emptyOutDir: false,
    target: 'es2016',
    minify: false,
    sourcemap: false,
  },
})
