// Render cross-run comparison pages from the published archive.
//
//   npm run benchmark:compare
//
// The cytoscape.js v4 harness rendered these through its status site; this
// repo has no status site, so this small driver does the same join locally:
// for every (machine fingerprint, profile) with at least two published runs,
// it writes one comparison page (`benchmark/report-compare.mjs`) into
// benchmark/results/ (gitignored — the page is derived, the archive is the
// source of truth). Runs from different machines are never joined.

import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  buildComparison,
  renderComparison,
  comparePageName,
} from '../benchmark/report-compare.mjs'
import { loadPublished, PUBLISHED_DIR } from './benchmark-publish.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = join(ROOT, 'benchmark', 'results')

/**
 * Group runs by machine fingerprint, keeping each group's newest-first order.
 * Runs with no fingerprint go in their own "unknown machine" group rather
 * than being merged into a real one — merging them would be a guess
 * presented as a fact.
 */
export function byMachine(runs) {
  const groups = new Map()

  for (const run of runs) {
    const key = run.fingerprint ?? 'unknown'
    const group = groups.get(key) ?? {
      fingerprint: run.fingerprint ?? null,
      machine: run.machine ?? null,
      runs: [],
    }

    group.machine = group.machine ?? run.machine ?? null
    group.runs.push(run)
    groups.set(key, group)
  }

  return [...groups.values()]
}

const runs = loadPublished(PUBLISHED_DIR)

if (runs.length === 0) {
  console.log('nothing published yet — see benchmark/published/README.md')
  process.exit(0)
}

let pages = 0

for (const group of byMachine(runs)) {
  const byProfile = new Map()

  for (const run of group.runs) {
    const key = run.profile ?? '?'

    byProfile.set(key, [...(byProfile.get(key) ?? []), run])
  }

  for (const [profile, profileRuns] of byProfile) {
    if (profileRuns.length < 2) {
      continue
    }

    // buildComparison wants oldest first; loadPublished returns newest first
    const comparison = buildComparison([...profileRuns].reverse())
    const name = comparePageName(group.fingerprint ?? 'unknown', profile)
    const path = join(OUT_DIR, name.replace(/^benchmark\//, ''))

    writeFileSync(
      path,
      renderComparison(comparison, {
        machine: group.machine,
        fingerprint: group.fingerprint,
      }),
    )
    console.log(`compare: ${path} (${profileRuns.length} runs)`)
    pages++
  }
}

if (pages === 0) {
  console.log(
    'no (machine, profile) has two published runs yet — nothing to compare',
  )
}
