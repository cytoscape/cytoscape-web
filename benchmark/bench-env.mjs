// Benchmark process environment. MUST be the textually first static import
// of every suite, so it evaluates before any `@/` module.
//
// The suites run in plain Node (via `node --import tsx`), but parts of the
// app assume a browser: `src/data/db/index.ts` starts with
// `import 'dexie-observable'`, which reads `self` at module scope and talks
// to `localStorage` for cross-tab signalling. Rather than dragging jsdom's
// timers and layout machinery into every benchmark process (noise), this
// file installs the minimal set the bench import graph actually needs:
//
//   - `self` / `window` aliases of globalThis
//   - a Map-backed `localStorage`
//   - fake-indexeddb (same substitute the unit suite uses — NOT real
//     IndexedDB latency; db rows are regression-sensitive, not absolute)
//   - immer's enableMapSet(), which every standalone entry point must call
//     before Immer touches a Map or Set (AGENTS.md hard rule)
//
// NOT shimmed: the vite `define`d bare globals (REACT_APP_BUILD_TIME,
// REACT_APP_VERSION). They are referenced only from boot/UI modules that are
// off the bench import graph. If a suite ever imports boot code, the symptom
// is `ReferenceError: REACT_APP_BUILD_TIME is not defined` — shim it here.
//
// This file is part of SHARED_HARNESS in harness-id.mjs: changing a shim
// re-stamps every suite's harness hash, which is correct — the environment
// is part of the instrument.

import { enableMapSet } from 'immer'

globalThis.self ??= globalThis
globalThis.window ??= globalThis

// dexie-observable registers 'storage'/'unload' listeners for cross-tab
// signalling; there are no other tabs in a benchmark process, so no-ops are
// the honest implementation.
globalThis.addEventListener ??= () => {}
globalThis.removeEventListener ??= () => {}
globalThis.dispatchEvent ??= () => true

if (globalThis.localStorage == null) {
  const store = new Map()

  globalThis.localStorage = {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => void store.set(k, String(v)),
    removeItem: (k) => void store.delete(k),
    clear: () => store.clear(),
    key: (i) => [...store.keys()][i] ?? null,
    get length() {
      return store.size
    },
  }
}

await import('fake-indexeddb/auto')

enableMapSet()
