/// <reference types="vitest" />
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

import { federation } from '@module-federation/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type ConfigEnv, type Connect, type Plugin, type PluginOption, type UserConfig, type ViteDevServer } from 'vite'
import type { ServerResponse } from 'node:http'

import config from './src/assets/config.json'
import packageJson from './package.json'
import {
  FEDERATION_EXPOSES,
  FEDERATION_FILENAME,
  FEDERATION_NAME,
  FEDERATION_SHARED_SINGLETONS,
} from './src/app-api/federation/federationExposes'

function readGitMetadata(command: string): string {
  try {
    return execSync(command).toString().trim()
  } catch {
    return 'unknown'
  }
}

const buildTime = new Date().toISOString()
const gitCommit = readGitMetadata('git rev-parse --short HEAD')
const lastCommitTime = readGitMetadata('git show -s --format=%cI HEAD')
const deps = packageJson.dependencies

/**
 * Dev-server-only plugin that serves the runtime apps manifest at `/apps.json`.
 * For production builds the manifest is copied into `dist` by the `copy:dist`
 * npm script (cpy-cli), so no build-time emission is needed here.
 */
function serveAppsConfigInDev(appsConfigPath: string): Plugin {
  return {
    name: 'serve-apps-config-in-dev',
    apply: 'serve',
    configureServer(server: ViteDevServer) {
      server.middlewares.use((req: Connect.IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
        if (req.url === '/apps.json') {
          res.setHeader('Content-Type', 'application/json')
          res.end(fs.readFileSync(appsConfigPath, 'utf8'))
          return
        }

        next()
      })
    },
  }
}

export default defineConfig(async ({ command, mode }: ConfigEnv) => {
  const appsConfigPath = path.resolve(
    __dirname,
    command === 'build' ? 'src/assets/apps.json' : 'src/assets/apps.local.json',
  )

  const plugins: PluginOption[] = [
    react(),
    federation({
      name: FEDERATION_NAME,
      filename: FEDERATION_FILENAME,
      // Public types are published separately via the @cytoscape-web/api-types
      // package, so skip Module Federation's own .d.ts generation.
      dts: false,
      // Exposes are defined in src/app-api/federation/federationExposes.ts so
      // the build and the contract tests share one source of truth.
      exposes: { ...FEDERATION_EXPOSES },
      shared: Object.fromEntries(
        FEDERATION_SHARED_SINGLETONS.map((name) => [
          name,
          { singleton: true, requiredVersion: deps[name as keyof typeof deps] },
        ]),
      ),
    }),
    serveAppsConfigInDev(appsConfigPath),
  ]

  // Emit a bundle-size report when ANALYZE=true (parity with the old
  // webpack-bundle-analyzer `build:analyze` script). Imported dynamically
  // because rollup-plugin-visualizer is ESM-only.
  if (process.env.ANALYZE) {
    const { visualizer } = await import('rollup-plugin-visualizer')
    plugins.push(
      visualizer({
        filename: 'ba/bundle-report.html',
        template: 'treemap',
        gzipSize: true,
        brotliSize: true,
      }) as PluginOption,
    )
  }

  const resolved: UserConfig = {
    base: config.urlBaseName !== '' ? config.urlBaseName : '/',
    plugins,
    resolve: {
      extensions: ['.tsx', '.ts', '.js', '.jsx'],
    },
    server: {
      port: 5500,
      strictPort: true,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    },
    build: {
      outDir: 'dist',
      // esnext output target so the Module Federation runtime's top-level
      // await (`importShared`) is allowed under Rolldown (Vite 8). Without
      // this, Rolldown errors with REQUIRE_TLA on shared deps (@mui/@emotion).
      target: 'esnext',
      // Minifier is left at Vite 8's default (Oxc, fast).
      // Source maps in development builds only. Production omits them —
      // matching the old webpack config (`devtool: false` in production) and
      // shaving build time by skipping multi-MB .map generation. (The dev
      // server emits source maps regardless of this setting.)
      sourcemap: mode !== 'production',
      // Strip console.* from production bundles (parity with the old Terser
      // `drop_console: true`). Vite 8's Oxc minifier is configured through
      // Rolldown's minify.compress options.
      rolldownOptions:
        mode === 'production'
          ? { output: { minify: { compress: { dropConsole: true } } } }
          : undefined,
      // NOTE: manual vendor/export chunk splitting was removed in the Vite 8 /
      // Module Federation migration — the federation plugin disables
      // `manualChunks` (grouping its async-init shared modules into one chunk
      // causes circular-async hangs). Chunking is left to the plugin + Rolldown.
    },
    define: {
      'process.env.REACT_APP_GIT_COMMIT': JSON.stringify(gitCommit),
      'process.env.REACT_APP_LAST_COMMIT_TIME': JSON.stringify(lastCommitTime),
      'process.env.REACT_APP_BUILD_TIME': JSON.stringify(buildTime),
      'process.env.REACT_APP_VERSION': JSON.stringify(packageJson.version),
      REACT_APP_BUILD_TIME: JSON.stringify(buildTime),
      REACT_APP_VERSION: JSON.stringify(packageJson.version),
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./vitest-setup.ts'],
    },
  }

  return resolved
})
