import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // The engine is DOM-free by design, so everything runs in node.
    environment: 'node',
    // app/export.ts's annotationExportHtml is a pure string function with
    // no DOM dependency, so its test lives in app/ alongside the module —
    // widened just enough to pick it up, not all of app/.
    include: ['src/**/*.test.ts', 'app/export.test.ts'],
  },
})
