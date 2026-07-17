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
 * Owns the runtime apps manifest at `/apps.json` for both modes: the dev
 * server serves it as middleware (from apps.local.json), and production
 * builds emit it into `dist` (from apps.json) via generateBundle — so a
 * bare `vite build` produces a complete, deployable dist.
 */
function appsConfigPlugin(appsConfigPath: string): Plugin {
  return {
    name: 'apps-config',
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
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'apps.json',
        source: fs.readFileSync(appsConfigPath, 'utf8'),
      })
    },
  }
}

/**
 * Build-only plugin that paints the boot splash before the Module
 * Federation bootstrap finishes.
 *
 * The generated mf-entry-bootstrap awaits the federation runtime's
 * share-scope setup, which transitively downloads the ~700kB MUI shared
 * chunk (react-dom is co-located in it) before src/index.tsx ever runs —
 * so nothing in the normal entry graph can paint sooner than that
 * download. This plugin emits src/init/bootSplashEntry.ts as its own tiny
 * chunk (its graph is just the splash) and injects it as the FIRST module
 * script in index.html, so the splash paints within a few round-trips.
 * It also preloads the dynamically-imported init chunk, which Vite's own
 * preload injection misses (one discovery round-trip saved).
 */
function bootSplashPlugin(): Plugin {
  return {
    name: 'boot-splash',
    apply: 'build',
    buildStart() {
      this.emitFile({
        type: 'chunk',
        id: 'src/init/bootSplashEntry.ts',
        name: 'bootSplash',
      })
    },
    // writeBundle (after index.html is finalized on disk): transformIndexHtml
    // hooks run before Vite injects its own preload tags.
    writeBundle(options, bundle) {
      const htmlPath = path.resolve(options.dir ?? 'dist', 'index.html')
      if (!fs.existsSync(htmlPath)) return

      let html = fs.readFileSync(htmlPath, 'utf8')
      const base = config.urlBaseName !== '' ? config.urlBaseName : '/'

      const findChunk = (facadeSuffix: string) => {
        const chunk = Object.values(bundle).find(
          (c) =>
            c.type === 'chunk' &&
            ((c as { facadeModuleId?: string | null }).facadeModuleId ?? '').endsWith(facadeSuffix),
        )
        return chunk as { fileName: string; imports: string[] } | undefined
      }

      const splashChunk = findChunk('src/init/bootSplashEntry.ts')
      if (splashChunk !== undefined) {
        const splashPreloads = splashChunk.imports
          .map(
            (fileName) =>
              `<link rel="modulepreload" crossorigin href="${base}${fileName}">`,
          )
          .join('')
        html = html.replace(
          '<script type="module"',
          `${splashPreloads}<script type="module" crossorigin src="${base}${splashChunk.fileName}"></script><script type="module"`,
        )
      }

      const initChunk = findChunk('src/init.tsx')
      if (initChunk !== undefined) {
        html = html.replace(
          '</head>',
          `<link rel="modulepreload" crossorigin href="${base}${initChunk.fileName}"></head>`,
        )
      }

      fs.writeFileSync(htmlPath, html)
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
    appsConfigPlugin(appsConfigPath),
    bootSplashPlugin(),
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
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
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
      // Referenced source maps are fetched by browsers when developer tooling
      // requests them; normal page loads do not download the .map files.
      sourcemap: true,
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
