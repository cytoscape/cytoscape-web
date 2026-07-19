#!/usr/bin/env node
/**
 * Cytoscape Desktop CX2 round-trip harness.
 *
 * Cytoscape Web sends networks to Desktop exactly like this (see
 * src/data/hooks/useOpenInCytoscapeDesktop.ts →
 * @js4cytoscape/ndex-client CyNDEx.postCX2NetworkToCytoscape):
 *
 *     POST http://127.0.0.1:1234/v1/networks?format=cx2&title=<n>&collection=<n>
 *     Content-Type: application/json
 *     body: <raw CX2 JSON string>
 *
 * This script lets you reproduce that outside the app, so you can confirm which
 * CX2 shapes Desktop's importer accepts vs. rejects (crash-level bugs). It
 * cannot see the "?" broken-image placeholder — that is a render-time symptom
 * you must confirm visually in Desktop — but it does surface import-time
 * failures (ClassCastException, NullPointerException, malformed-mapping errors).
 *
 * Requires: Cytoscape Desktop 3.6+ running with the CyREST app (default) on port
 * 1234. Node 18+ (global fetch). No repo imports — runs standalone.
 *
 * Usage:
 *   node scripts/desktop-roundtrip/desktop-cx2-roundtrip.mjs check
 *   node scripts/desktop-roundtrip/desktop-cx2-roundtrip.mjs post <file.cx2> [name]
 *   node scripts/desktop-roundtrip/desktop-cx2-roundtrip.mjs probe <baseFile.cx2>
 *   node scripts/desktop-roundtrip/desktop-cx2-roundtrip.mjs readback <suid> [out.cx2]
 */

import { readFileSync, writeFileSync } from 'fs'
import { basename } from 'path'

const BASE = process.env.CYREST_URL ?? 'http://127.0.0.1:1234'

const log = (...a) => console.log(...a)
const err = (...a) => console.error(...a)

async function version() {
  const res = await fetch(`${BASE}/v1/version`)
  if (!res.ok) throw new Error(`version ${res.status}`)
  return res.json()
}

async function checkCmd() {
  try {
    const v = await version()
    log('✅ Cytoscape Desktop reachable at', BASE)
    log('   ', JSON.stringify(v))
    return true
  } catch (e) {
    err('❌ Cannot reach Cytoscape Desktop at', BASE)
    err('   Start Desktop (3.6+) with the CyREST app, or set CYREST_URL.')
    err('   ', String(e.message ?? e))
    return false
  }
}

/**
 * POST a raw CX2 string exactly as Cytoscape Web does.
 * Returns { ok, status, body } — body is the parsed response (SUID on success,
 * or the error payload Desktop returns on import failure).
 */
async function postCx2(cx2String, name) {
  const params = new URLSearchParams({
    format: 'cx2',
    title: name,
    collection: name,
  })
  const res = await fetch(`${BASE}/v1/networks?${params}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: cx2String,
  })
  let body
  const text = await res.text()
  try {
    body = JSON.parse(text)
  } catch {
    body = text
  }
  return { ok: res.ok, status: res.status, body }
}

async function postCmd(file, name) {
  const cx2String = readFileSync(file, 'utf-8')
  const label = name ?? `roundtrip-${basename(file)}`
  log(`→ POST ${file} as "${label}"`)
  const r = await postCx2(cx2String, label)
  if (r.ok) {
    log(`✅ imported. SUID/response:`, JSON.stringify(r.body))
    log(
      `   Now LOOK at the network in Desktop: are the custom-graphic images` +
        ` rendered, or shown as "?" placeholders?`,
    )
  } else {
    err(`❌ import failed (HTTP ${r.status})`)
    err(`   Desktop error payload:`, JSON.stringify(r.body, null, 2))
  }
  return r
}

async function readbackCmd(suid, out) {
  const res = await fetch(`${BASE}/v1/networks/${suid}?format=cx2`)
  if (!res.ok) throw new Error(`readback ${res.status}`)
  const cx2 = await res.text()
  if (out) {
    writeFileSync(out, cx2)
    log(`✅ wrote Desktop's stored CX2 to ${out}`)
  } else {
    log(cx2)
  }
}

// --- probe: post a base file plus targeted single-variable mutations, so we
// can isolate which CX2 shape Desktop's importer rejects. Only mutations the
// import API can distinguish (crash vs no-crash) are worthwhile here.

function walkVisualProps(cx2, fn) {
  for (const aspect of cx2) {
    if (Array.isArray(aspect.visualProperties)) {
      for (const vp of aspect.visualProperties) fn(vp)
    }
  }
}

const MUTATIONS = {
  // Desktop-compat hack under test: NODE_CUSTOMGRAPHICS_SIZE_* as "50.0" string.
  sizeAsNumber(cx2) {
    walkVisualProps(cx2, (vp) => {
      const node = vp?.default?.node ?? {}
      for (const k of Object.keys(node)) {
        if (k.startsWith('NODE_CUSTOMGRAPHICS_SIZE') && typeof node[k] === 'string') {
          node[k] = parseFloat(node[k])
        }
      }
    })
    return cx2
  },
  // Force a passthrough definition to drop `type` (reproduce CW's current output).
  dropPassthroughType(cx2) {
    walkVisualProps(cx2, (vp) => {
      const m = vp?.nodeMapping ?? {}
      for (const k of Object.keys(m)) {
        if (m[k]?.type === 'PASSTHROUGH' && m[k].definition) {
          delete m[k].definition.type
        }
      }
    })
    return cx2
  },
  // Ensure passthrough definitions carry type:"string" (Desktop's own shape).
  addPassthroughType(cx2) {
    walkVisualProps(cx2, (vp) => {
      const m = vp?.nodeMapping ?? {}
      for (const k of Object.keys(m)) {
        if (m[k]?.type === 'PASSTHROUGH' && m[k].definition && !m[k].definition.type) {
          m[k].definition.type = 'string'
        }
      }
    })
    return cx2
  },
}

async function probeCmd(baseFile) {
  const base = readFileSync(baseFile, 'utf-8')
  const variants = [
    ['as-is (CW output)', (c) => c],
    ['size→number', MUTATIONS.sizeAsNumber],
    ['passthrough type dropped', MUTATIONS.dropPassthroughType],
    ['passthrough type=string added', MUTATIONS.addPassthroughType],
  ]
  log(`Probing Desktop import with ${variants.length} variants of ${baseFile}\n`)
  const results = []
  for (const [label, mutate] of variants) {
    const cx2 = mutate(JSON.parse(base))
    const r = await postCx2(JSON.stringify(cx2), `probe: ${label}`)
    const verdict = r.ok ? '✅ import OK' : `❌ HTTP ${r.status}`
    log(`${verdict}  —  ${label}`)
    if (!r.ok) log(`      ${JSON.stringify(r.body)}`)
    results.push({ label, ok: r.ok, status: r.status })
  }
  log('\nSummary:')
  for (const r of results) log(`  ${r.ok ? '✅' : '❌'} ${r.label}`)
  log(
    '\nImport-OK means no crash. Then eyeball each imported network in Desktop' +
      ' for "?" placeholders to separate crash-bugs from render-bugs.',
  )
}

async function main() {
  const [cmd, ...args] = process.argv.slice(2)
  switch (cmd) {
    case 'check':
      process.exit((await checkCmd()) ? 0 : 1)
      break
    case 'post':
      if (!(await checkCmd())) process.exit(1)
      await postCmd(args[0], args[1])
      break
    case 'probe':
      if (!(await checkCmd())) process.exit(1)
      await probeCmd(args[0])
      break
    case 'readback':
      await readbackCmd(args[0], args[1])
      break
    default:
      err('Usage: check | post <file.cx2> [name] | probe <baseFile.cx2> | readback <suid> [out.cx2]')
      process.exit(2)
  }
}

main().catch((e) => {
  err(String(e?.stack ?? e))
  process.exit(1)
})
