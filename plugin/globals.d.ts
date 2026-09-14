// src/run.ts guards `performance` with `typeof performance !== 'undefined'` so
// it can run without DOM (the plugin's QJSEngine has no `performance` global).
// tsconfig.plugin.json has no DOM lib, so this names the identifier for tsc.
declare const performance: { now(): number }
