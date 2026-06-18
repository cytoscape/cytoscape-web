import { federation } from '@module-federation/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Standalone Module Federation remote for the Tier-3.2 "host loads a real
// remote" E2E. A SEPARATE build from the host so the test exercises the real
// cross-bundle path: ESM import of remoteEntry.js → container.init(shareScope)
// → container.get('./AppConfig') → mount(). `react`/`react-dom` are declared as
// shared singletons; Stage 3 of the loader modernization wires the host's
// instances into the share scope so the remote resolves a single React.
export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'testRemoteApp',
      filename: 'remoteEntry.js',
      dts: false,
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
