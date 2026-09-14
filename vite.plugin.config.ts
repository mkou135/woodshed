import { defineConfig } from 'vite'

// Qt 6.10's V4 engine lacks the ES2019+ array/string additions (verified by
// string-scanning the shipped QtQml framework): no `Array.prototype.flat`,
// `flatMap`, `at`, `findLast`, `findLastIndex`, `String.prototype.trimStart`,
// `trimEnd`, `matchAll`, `replaceAll`, or `Object.fromEntries`. The bundle
// uses four of them (`flatMap` from `src/analyse/detectors/shapes.ts`'s
// `DICTIONARY`, and `trimStart` from fast-xml-parser's DOCTYPE path) — this
// prelude polyfills exactly those four, each guarded so a Qt that ships it
// wins. `plugin/bundle.test.ts` deletes all nine from its VM context before
// loading the bundle, to prove this prelude suffices.
const PRELUDE = `
/* woodshed: builtins Qt 6.10's V4 lacks (ES2019+). Guarded; dropped when Qt ships them. */
;(function () {
  if (!Array.prototype.flat) {
    Object.defineProperty(Array.prototype, 'flat', { configurable: true, writable: true, value: function (depth) {
      var d = depth === undefined ? 1 : depth
      var out = []
      for (var i = 0; i < this.length; i++) {
        var v = this[i]
        if (d > 0 && Array.isArray(v)) out.push.apply(out, v.flat(d - 1))
        else out.push(v)
      }
      return out
    } })
  }
  if (!Array.prototype.flatMap) {
    Object.defineProperty(Array.prototype, 'flatMap', { configurable: true, writable: true, value: function (fn, thisArg) {
      return Array.prototype.map.call(this, fn, thisArg).flat(1)
    } })
  }
  if (!String.prototype.trimStart) {
    Object.defineProperty(String.prototype, 'trimStart', { configurable: true, writable: true, value: function () { return this.replace(/^\\s+/, '') } })
  }
  if (!String.prototype.trimEnd) {
    Object.defineProperty(String.prototype, 'trimEnd', { configurable: true, writable: true, value: function () { return this.replace(/\\s+$/, '') } })
  }
})()
`

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
    rollupOptions: {
      output: {
        banner: PRELUDE,
      },
    },
  },
})
