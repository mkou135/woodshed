import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // The engine is DOM-free by design, so everything runs in node.
    environment: 'node',
    // app/ tests live alongside the modules they cover (app/export.test.ts
    // today). Pinning that one filename would mean the next app/ test
    // someone adds silently never runs — no error, just missing coverage —
    // so this is a glob, not a literal path. Environment stays 'node': the
    // only app/ tests expected here are pure functions like
    // annotationExportHtml; anything needing a real DOM (downloadHtml,
    // ScoreView.exportAnnotations) isn't unit-tested this way regardless.
    include: ['src/**/*.test.ts', 'app/**/*.test.ts'],
  },
})
