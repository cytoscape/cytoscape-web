/**
 * One-time (and re-runnable) bootstrap of the per-version API surface
 * snapshots consumed by the "surface diff" section.
 *
 * The surface of a released version = the code state just before the NEXT
 * version's bump commit (bumps land at the START of a version's work). The
 * latest version's surface is HEAD.
 *
 * Re-run after a new version bump lands to freeze the just-released surface:
 *   ts-node bootstrap-surfaces.ts
 *
 * Writes scripts/generate-api-docs/surfaces/<version>.json and versions.json.
 */
import * as fs from 'fs'
import * as path from 'path'
import { execFileSync } from 'child_process'
import { extractSurface } from './extract-surface'

const OUT_DIR = path.resolve(__dirname, 'surfaces')
const REPO_ROOT = path.resolve(__dirname, '../..')

/**
 * version label (from package.json at the surface commit) → surface commit.
 * `HEAD` marks the in-progress version, regenerated on every run.
 * Historical commits are the PARENT of the commit that bumped away from them.
 */
const SURFACE_COMMITS: Array<{
  version: string
  date: string
  commit: string
}> = [
  { version: '1.0.0-beta.4', date: '2026-07-19', commit: 'HEAD' },
  { version: '1.0.0-beta.3', date: '2026-07-19', commit: 'd41d3279^' },
  { version: '1.0.0-beta.2', date: '2026-07-16', commit: '0671c8a8^' },
  { version: '1.0.0-beta.1', date: '2026-03-18', commit: 'bbc514b2^' },
  { version: '0.1.0-alpha.4', date: '2026-03-16', commit: 'a8b7c6a0^' },
  { version: '0.1.0-alpha.3', date: '2026-03-14', commit: '59d6bec0^' },
  { version: '0.1.0-alpha.2', date: '2026-03-12', commit: '2e3ac6c1^' },
  { version: '0.1.0-alpha.1', date: '2026-03-12', commit: '0f5da036^' },
  { version: '0.1.0-alpha.0', date: '2026-03-07', commit: '5549f55d^' },
]

function resolveSha(ref: string): string {
  if (ref === 'HEAD') return 'HEAD'
  return execFileSync('git', ['rev-parse', '--short', ref], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  }).trim()
}

function main(): void {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  const index: Array<{
    version: string
    date: string
    commit: string
    methodCount: number
  }> = []

  for (const entry of SURFACE_COMMITS) {
    const commit = entry.commit === 'HEAD' ? null : entry.commit
    const surface = extractSurface(commit, entry.version)
    surface.commit = resolveSha(entry.commit)
    const methodCount = Object.values(surface.namespaces).reduce(
      (n, ns) => n + Object.keys(ns.methods).length,
      0,
    )
    const file = path.join(OUT_DIR, `${entry.version}.json`)
    fs.writeFileSync(file, JSON.stringify(surface, null, 2) + '\n')
    index.push({
      version: entry.version,
      date: entry.date,
      commit: surface.commit,
      methodCount,
    })
    console.log(
      `  ${entry.version.padEnd(15)} @ ${surface.commit.padEnd(10)} — ${
        Object.keys(surface.namespaces).length
      } namespaces, ${methodCount} methods`,
    )
  }

  fs.writeFileSync(
    path.join(OUT_DIR, 'versions.json'),
    JSON.stringify(index, null, 2) + '\n',
  )
  console.log(`\nwrote ${index.length} snapshots + versions.json`)
}

main()
