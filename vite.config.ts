import { defineConfig } from 'vite'
import { annotatePlugin } from './scripts/viteAnnotate.ts'

export default defineConfig({
  root: '.',
  // Relative asset paths, so the build works at any URL — including
  // GitHub Pages' https://<user>.github.io/woodshed/ subpath.
  base: './',
  build: { outDir: 'dist' },
  plugins: [annotatePlugin()],
})
