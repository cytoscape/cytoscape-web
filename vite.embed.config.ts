import path from 'path'

import react from '@vitejs/plugin-react'
import {
  defineConfig,
  type Connect,
  type Plugin,
  type PreviewServer,
  type ViteDevServer,
} from 'vite'
import type { ServerResponse } from 'node:http'

import config from './src/assets/config.json'
import { ensureTrailingSlash } from './src/utils/baseUrl'

/**
 * Build config for the embeddable viewer (#871), the page served at
 * `/embed/<uuid>`. It is separate from vite.config.ts because the Module
 * Federation plugin rewrites every HTML output to load its bootstrap, which
 * would pull the shared MUI chunk into the embed. This config has no
 * federation plugin, so embed.html loads only its own graph.
 *
 * The build writes into the same dist/ as the main app. Run it after the
 * main build: `emptyOutDir: false` keeps the app's files, and the separate
 * assets folder keeps the two builds' chunks apart.
 */

const base = ensureTrailingSlash(config.urlBaseName)
const EMBED_ROUTE = new RegExp(`^${base}embed/[^/?#]+/?(\\?.*)?$`)

/**
 * Serve embed.html for `/embed/<uuid>` in dev and preview, standing in for
 * the production server's route.
 */
function embedRoutePlugin(): Plugin {
  const rewrite = (
    req: Connect.IncomingMessage,
    _res: ServerResponse,
    next: Connect.NextFunction,
  ) => {
    const match = req.url?.match(EMBED_ROUTE)
    if (match) {
      req.url = `${base}embed.html${match[1] ?? ''}`
    }
    next()
  }
  return {
    name: 'embed-route',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(rewrite)
    },
    configurePreviewServer(server: PreviewServer) {
      server.middlewares.use(rewrite)
    },
  }
}

export default defineConfig({
  base,
  plugins: [react(), embedRoutePlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
    extensions: ['.tsx', '.ts', '.js', '.jsx'],
  },
  // embed.html is the only page; no SPA fallback to index.html
  appType: 'mpa',
  server: {
    // 5500 is the app's dev server and e2e preview; agents run their own
    // `vite preview` on 5501 (.serena/memories/lessons.md). The embed needs
    // no Keycloak, so an unregistered port is fine.
    port: 5502,
    strictPort: true,
    open: `${base}embed/`,
  },
  preview: {
    port: 5502,
    strictPort: true,
  },
  // The prepare worker (src/embed/prepare.worker.ts) is an ES module, so
  // it can share chunks with the page
  worker: { format: 'es' },
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    assetsDir: 'embed-assets',
    target: 'es2022',
    sourcemap: true,
    rolldownOptions: {
      input: path.resolve(__dirname, 'embed.html'),
      output: { minify: { compress: { dropConsole: true } } },
    },
  },
})
