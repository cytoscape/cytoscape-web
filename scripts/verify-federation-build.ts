/**
 * Tier-2 build-output smoke verifier for the Module Federation public surface.
 *
 * Proves that a `dist/` produced by `npm run build` actually emits the
 * federation contract: the `remoteEntry.js` container, an expose key for every
 * entry in FEDERATION_EXPOSES, and the shared singletons. Run AFTER a build:
 *
 *   npm run build && npm run verify:federation
 *
 * Matches on STABLE substrings only (`virtual_mf-exposes`, `"./ElementApi":`,
 * the FEDERATION_EXPOSES keys, singleton names) — never on content hashes — so
 * it survives unrelated rebuilds. Exits non-zero on any miss so CI gates on it.
 */
import fs from 'fs'
import path from 'path'

import {
  FEDERATION_EXPOSES,
  FEDERATION_FILENAME,
  FEDERATION_SHARED_SINGLETONS,
} from '../src/app-api/federation/federationExposes'

const REPO_ROOT = path.resolve(__dirname, '..')
const DIST = path.resolve(REPO_ROOT, 'dist')

const failures: string[] = []
const checks: string[] = []

function check(label: string, ok: boolean): void {
  if (ok) {
    checks.push(`  ✓ ${label}`)
  } else {
    failures.push(label)
  }
}

// 1. remoteEntry.js exists and declares the MF container contract (get + init).
const remoteEntryPath = path.resolve(DIST, FEDERATION_FILENAME)
const remoteEntryExists = fs.existsSync(remoteEntryPath)
check(`${FEDERATION_FILENAME} exists`, remoteEntryExists)
if (remoteEntryExists) {
  const src = fs.readFileSync(remoteEntryPath, 'utf8')
  check('remoteEntry.js exports `get`', /as get\b/.test(src))
  check('remoteEntry.js exports `init`', /as init\b/.test(src))
}

// 2. Locate the (non-ssr) virtual exposes chunk and assert it lists every key.
const assetsDir = path.resolve(DIST, 'assets')
const exposesChunk = fs.existsSync(assetsDir)
  ? fs
      .readdirSync(assetsDir)
      .find(
        (f) =>
          f.startsWith('virtual_mf-exposes') &&
          !f.startsWith('virtual_mf-exposes-ssr') &&
          f.endsWith('.js'),
      )
  : undefined

check('virtual_mf-exposes chunk present', exposesChunk !== undefined)
if (exposesChunk !== undefined) {
  const chunkSrc = fs.readFileSync(path.resolve(assetsDir, exposesChunk), 'utf8')
  for (const key of Object.keys(FEDERATION_EXPOSES)) {
    check(`expose key in chunk: "${key}"`, chunkSrc.includes(`"${key}":`))
  }
}

// 3. Shared singletons registered (guards the second-React/MUI-copy failure).
// The plugin records shared deps across its runtime chunks, so scan all JS in
// dist for each singleton package name appearing in a share registration.
const allJs: string[] = []
if (fs.existsSync(assetsDir)) {
  for (const f of fs.readdirSync(assetsDir)) {
    if (f.endsWith('.js')) {
      allJs.push(fs.readFileSync(path.resolve(assetsDir, f), 'utf8'))
    }
  }
}
if (remoteEntryExists) {
  allJs.push(fs.readFileSync(remoteEntryPath, 'utf8'))
}
const allJsBlob = allJs.join('\n')
for (const name of FEDERATION_SHARED_SINGLETONS) {
  // The plugin registers each shared dep as `<name>:{shareConfig:{singleton...`
  // — the key is quoted only when it is not a valid JS identifier (so `react`
  // is bare, but `react-dom` / `@mui/material` are quoted). Match either form.
  const escaped = name.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')
  const registered = new RegExp(`"?${escaped}"?:\\{shareConfig`).test(allJsBlob)
  check(`shared singleton registered: ${name}`, registered)
}

// 4. Non-empty output: at least the exposes chunk carries real content.
if (exposesChunk !== undefined) {
  const size = fs.statSync(path.resolve(assetsDir, exposesChunk)).size
  check('exposes chunk is non-empty', size > 0)
}

// --- summary ---
console.log('\nModule Federation build verification\n')
for (const line of checks) console.log(line)
if (failures.length > 0) {
  console.error(`\n✗ ${failures.length} check(s) FAILED:`)
  for (const f of failures) console.error(`  ✗ ${f}`)
  console.error('\nDid you run `npm run build` first?')
  process.exit(1)
}
console.log(`\n✓ all ${checks.length} checks passed\n`)
