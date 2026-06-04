import { execSync } from 'child_process'
import path from 'path'

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

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

export default defineConfig({
  base: config.urlBaseName !== '' ? config.urlBaseName : '/',
  plugins: [react()],
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
})