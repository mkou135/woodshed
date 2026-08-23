import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // The engine is DOM-free by design, so everything runs in node.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
