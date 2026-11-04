#!/usr/bin/env node
// Report the gzipped size of what dist/embed.html loads before first paint:
// its module scripts, stylesheets, and every chunk they import statically.
// Dynamic import() chunks are listed separately; they load on demand.
//
// Usage: node scripts/check-embed-size.mjs [distDir]

import fs from 'node:fs'
import path from 'node:path'
import { gzipSync } from 'node:zlib'

const distDir = path.resolve(process.argv[2] ?? 'dist')
const htmlPath = path.join(distDir, 'embed.html')

if (!fs.existsSync(htmlPath)) {
  console.error(`No ${htmlPath}. Run the embed build first.`)
  process.exit(1)
}

const html = fs.readFileSync(htmlPath, 'utf8')

if (html.includes('mf-entry-bootstrap')) {
  console.error('embed.html loads the Module Federation bootstrap.')
  process.exit(1)
}

// Hrefs in the HTML are rooted at the build's base path. Strip it by
// matching the tail against files that exist in dist/.
const resolveHref = (href) => {
  const parts = href.split('?')[0].split('/').filter(Boolean)
  for (let i = 0; i < parts.length; i++) {
    const candidate = path.join(distDir, ...parts.slice(i))
    if (fs.existsSync(candidate)) return candidate
  }
  return undefined
}

const entryHrefs = [
  ...html.matchAll(/<script[^>]+src="([^"]+)"/g),
  ...html.matchAll(/<link[^>]+href="([^"]+\.(?:js|css))"/g),
].map((m) => m[1])

const staticFiles = new Set()
const dynamicFiles = new Set()

const walk = (file) => {
  if (staticFiles.has(file)) return
  staticFiles.add(file)
  if (!file.endsWith('.js')) return
  const code = fs.readFileSync(file, 'utf8')
  const dir = path.dirname(file)
  // Static: `import"./a.js"`, `import{x}from"./a.js"`, `export*from"./a.js"`
  for (const m of code.matchAll(
    /(?:\bimport|\bexport)\s*(?:[\w$*{},\s]+?\s*from\s*)?["'](\.{1,2}\/[^"']+)["']/g,
  )) {
    walk(path.resolve(dir, m[1]))
  }
  for (const m of code.matchAll(
    /\bimport\(\s*["'`](\.{1,2}\/[^"'`]+)["'`]\s*\)/g,
  )) {
    dynamicFiles.add(path.resolve(dir, m[1]))
  }
}

for (const href of entryHrefs) {
  const file = resolveHref(href)
  if (file === undefined) {
    console.error(`embed.html references ${href}, which is not in ${distDir}`)
    process.exit(1)
  }
  walk(file)
}

const gz = (file) => gzipSync(fs.readFileSync(file)).length
const kb = (bytes) => `${(bytes / 1024).toFixed(1)} kB`

const report = (title, files) => {
  const rows = [...files]
    .map((file) => [path.relative(distDir, file), gz(file)])
    .sort((a, b) => b[1] - a[1])
  const total = rows.reduce((sum, [, size]) => sum + size, 0)
  console.log(`${title}: ${kb(total)} gzipped`)
  for (const [name, size] of rows)
    console.log(`  ${kb(size).padStart(10)}  ${name}`)
  return total
}

for (const file of staticFiles) dynamicFiles.delete(file)
report('First load', staticFiles)
if (dynamicFiles.size > 0) report('On demand', dynamicFiles)
