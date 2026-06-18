// Static file server for the Tier-3.2 fixture remote.
//
// Builds the remote (so the test always serves fresh output), then serves
// dist/ plus a dynamically-generated /manifest.json on a fixed port, with
// permissive CORS headers. CORS matters because the host fetches the manifest
// cross-origin and the remote's chunks are loaded as cross-origin ES modules.
//
// Used as a Playwright `webServer` entry — see playwright.config.ts.
import { execSync } from 'node:child_process'
import { createReadStream, existsSync } from 'node:fs'
import { createServer } from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST = path.join(__dirname, 'dist')
const PORT = 4191
const APP_ID = 'testRemoteApp'

// Always rebuild so the served bundle matches the current fixture source.
console.log('[remote-fixture] building remote...')
execSync('npx vite build', { cwd: __dirname, stdio: 'inherit' })

const MANIFEST = JSON.stringify([
  {
    id: APP_ID,
    name: 'Test Remote App',
    url: `http://localhost:${PORT}/remoteEntry.js`,
    author: 'E2E Fixture',
    description: 'E2E fixture remote that renders a marker on mount.',
    version: '1.0.0',
  },
])

const CONTENT_TYPES = {
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.json': 'application/json',
  '.html': 'text/html',
  '.css': 'text/css',
  '.map': 'application/json',
}

const server = createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  const url = (req.url ?? '/').split('?')[0]

  if (url === '/manifest.json') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(MANIFEST)
    return
  }

  // Resolve within DIST and prevent path traversal.
  const rel = url === '/' ? '/index.html' : url
  const filePath = path.join(DIST, path.normalize(rel))
  if (!filePath.startsWith(DIST) || !existsSync(filePath)) {
    res.writeHead(404)
    res.end('not found')
    return
  }

  res.writeHead(200, {
    'Content-Type': CONTENT_TYPES[path.extname(filePath)] ?? 'application/octet-stream',
  })
  createReadStream(filePath).pipe(res)
})

server.listen(PORT, () => {
  console.log(`[remote-fixture] serving on http://localhost:${PORT}`)
})
