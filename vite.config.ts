import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import { annotatePlugin } from './scripts/viteAnnotate.ts'

const page = (name: string): string => fileURLToPath(new URL(`./${name}`, import.meta.url))

export default defineConfig({
  root: '.',
  // Relative asset paths, so the build works at any URL — including
  // GitHub Pages' https://<user>.github.io/woodshed/ subpath.
  base: './',
  build: {
    outDir: 'dist',
    // Vite's default is the single `index.html`, which shipped the analyser
    // alone and left the other two pages dev-only. Naming all three here is
    // what puts them in `dist/`; the nav links between them are relative for
    // the same reason `base` is.
    rollupOptions: {
      input: {
        index: page('index.html'),
        annotate: page('annotate.html'),
        engine: page('engine.html'),
      },
    },
  },
  plugins: [annotatePlugin()],
})
