import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

import federation from '@originjs/vite-plugin-federation'
import react from '@vitejs/plugin-react'
import { defineConfig, Plugin } from 'vite'

import config from './src/assets/config.json'
import packageJson from './package.json'

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

function emitRuntimeAssets(appsConfigPath: string): Plugin {
  return {
    name: 'emit-runtime-assets',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
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

      if (process.env.BUILD === 'netlify') {
        this.emitFile({
          type: 'asset',
          fileName: '_redirects',
          source: fs.readFileSync('netlify/_redirects', 'utf8'),
        })
      }
    },
  }
}

export default defineConfig(({ command }) => {
  const appsConfigPath = path.resolve(
    __dirname,
    command === 'build' ? 'src/assets/apps.json' : 'src/assets/apps.local.json',
  )

  return {
    base: config.urlBaseName !== '' ? config.urlBaseName : '/',
    plugins: [
      react(),
      federation({
        name: 'cyweb',
        filename: 'remoteEntry.js',
        exposes: {
          './ApiTypes': './src/app-api/types/index.ts',
          './ElementApi': './src/app-api/useElementApi.ts',
          './NetworkApi': './src/app-api/useNetworkApi.ts',
          './SelectionApi': './src/app-api/useSelectionApi.ts',
          './ViewportApi': './src/app-api/useViewportApi.ts',
          './TableApi': './src/app-api/useTableApi.ts',
          './VisualStyleApi': './src/app-api/useVisualStyleApi.ts',
          './LayoutApi': './src/app-api/useLayoutApi.ts',
          './ExportApi': './src/app-api/useExportApi.ts',
          './WorkspaceApi': './src/app-api/useWorkspaceApi.ts',
          './AppIdContext': './src/app-api/AppIdContext.tsx',
          './EventBus': './src/app-api/useCyWebEvent.ts',
          './CredentialStore': './src/data/hooks/stores/CredentialStore.ts',
          './LayoutStore': './src/data/hooks/stores/LayoutStore.ts',
          './MessageStore': './src/data/hooks/stores/MessageStore.ts',
          './NetworkStore': './src/data/hooks/stores/NetworkStore.ts',
          './NetworkSummaryStore':
            './src/data/hooks/stores/NetworkSummaryStore.ts',
          './OpaqueAspectStore': './src/data/hooks/stores/OpaqueAspectStore.ts',
          './RendererStore': './src/data/hooks/stores/RendererStore.ts',
          './TableStore': './src/data/hooks/stores/TableStore.ts',
          './UiStateStore': './src/data/hooks/stores/UiStateStore.ts',
          './ViewModelStore': './src/data/hooks/stores/ViewModelStore.ts',
          './VisualStyleStore': './src/data/hooks/stores/VisualStyleStore.ts',
          './WorkspaceStore': './src/data/hooks/stores/WorkspaceStore.ts',
          './CreateNetwork': './src/data/task/useCreateNetwork.tsx',
          './CreateNetworkFromCx2':
            './src/data/task/useCreateNetworkFromCx2.tsx',
        },
        shared: {
          react: {
            version: deps.react,
            requiredVersion: deps.react,
          },
          'react-dom': {
            version: deps['react-dom'],
            requiredVersion: deps['react-dom'],
          },
          '@mui/material': {
            version: deps['@mui/material'],
            requiredVersion: deps['@mui/material'],
          },
        },
      }),
      emitRuntimeAssets(appsConfigPath),
    ],
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
      sourcemap: true,
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
          silentCheckSso: path.resolve(__dirname, 'silent-check-sso.html'),
        },
      },
    },
    define: {
      'process.env.REACT_APP_GIT_COMMIT': JSON.stringify(gitCommit),
      'process.env.REACT_APP_LAST_COMMIT_TIME': JSON.stringify(lastCommitTime),
      'process.env.REACT_APP_BUILD_TIME': JSON.stringify(buildTime),
      'process.env.REACT_APP_VERSION': JSON.stringify(packageJson.version),
      REACT_APP_BUILD_TIME: JSON.stringify(buildTime),
      REACT_APP_VERSION: JSON.stringify(packageJson.version),
    },
  }
})