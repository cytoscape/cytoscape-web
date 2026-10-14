import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { federation } from '@module-federation/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, normalizePath } from 'vite'

import { CYWEB_HOST_REQUIRED } from './cywebHostSentinel'

// Pin the project root to this directory so the build works regardless of the
// invoking CWD (e.g. `vite build --config test/fixtures/remote-app/vite.config.ts`
// run from the repo root by the test:e2e pre-build step).
const fixtureRoot = dirname(fileURLToPath(import.meta.url))

// Absolute path: runtimePlugins are imported from a generated virtual module,
// where a relative specifier has no stable base to resolve against.
// normalizePath because the plugin interpolates this straight into an
// `import "<path>"` — a Windows backslash path is an invalid specifier.
const mfRuntimePlugin = normalizePath(
  fileURLToPath(new URL('./mfRuntimePlugin.ts', import.meta.url)),
)

// Standalone Module Federation remote for the Tier-3.2 "host loads a real
// remote" E2E. A SEPARATE build from the host so the test exercises the real
// cross-bundle path: ESM import of remoteEntry.js → container.init(shareScope)
// → container.get('./AppConfig') → mount(). `react`/`react-dom` are declared as
// shared singletons; Stage 3 of the loader modernization wires the host's
// instances into the share scope so the remote resolves a single React.
//
// It ALSO covers the reverse direction — remote → host — by importing
// `cyweb/WorkspaceApi` and calling it at runtime. Nothing else in the suite
// does, and that is the direction the runtime host resolution below changes.
export default defineConfig({
  root: fixtureRoot,
  plugins: [
    react(),
    federation({
      name: 'testRemoteApp',
      filename: 'remoteEntry.js',
      dts: false,
      // Rewrites the `cyweb` entry below with the URL the running host
      // publishes on window.__CYWEB_HOST__. Registering it here is the
      // load-bearing half: copying mfRuntimePlugin.ts without this line leaves
      // it inert, and the E2E would pass while exercising nothing.
      runtimePlugins: [mfRuntimePlugin],
      remotes: {
        cyweb: {
          // The host is a @module-federation/vite build and emits an ESM
          // remoteEntry.js. `type: 'module'` is REQUIRED — the plugin defaults
          // to 'var' (webpack-style global), which resolves no exports against
          // an ESM host and fails silently.
          type: 'module',
          name: 'cyweb',
          entryGlobalName: 'cyweb',
          shareScope: 'default',
          // Deliberately unloadable, exactly as a production app build ships
          // it. A resolver that never runs therefore cannot load anything, so
          // a broken one fails the E2E loudly instead of quietly succeeding
          // against a URL that happened to be right.
          entry: CYWEB_HOST_REQUIRED,
        },
      },
      exposes: {
        './AppConfig': './AppConfig.tsx',
      },
      shared: {
        react: { singleton: true },
        'react-dom': { singleton: true },
      },
    }),
  ],
  build: {
    outDir: 'dist',
    // esnext so the MF runtime's top-level await is allowed under Rolldown,
    // matching the host build.
    target: 'esnext',
    minify: false,
  },
})
