/**
 * Orchestrator for the Branch Review & Merge-Planning dashboard.
 *
 * Analyzes every local branch against an integration base (default
 * `development`), computes the pairwise conflict matrix (ground truth via
 * `git merge-tree`), the file-overlap heatmap (Jaccard heuristic), per-branch
 * review sizing, and a greedy merge-order plan — then injects it all into
 * template.html to produce a single self-contained HTML file.
 *
 *   ts-node generate.ts [--base <branch>] [--out <path>]
 *                       [--include-stale] [--max-loc <n>]
 *                       [--overlap-threshold <0..1>]
 *
 * Default --out is scratch/branch-review/index.html (gitignored). Point --out
 * at docs-site/ only to PUBLISH — that directory is deployed to a public
 * Netlify site, so branch names would become world-readable.
 */
import * as fs from 'fs'
import * as path from 'path'
import {
  analyze,
  gitVersion,
  makeNoiseMatcher,
  refExists,
  shortSha,
} from './git-analysis'
import { buildPlan } from './merge-plan'
import type {
  BranchReviewData,
  ConflictCell,
  MergeStep,
  OverlapCell,
} from './types'

const REPO_ROOT = path.resolve(__dirname, '../..')
const HERE = __dirname
const TEMPLATE = path.join(HERE, 'template.html')

interface Args {
  base: string
  out: string
  includeStale: boolean
  maxLoc: number
  maxAgeDays: number | null
  extraNoise: string[]
  overlapThreshold: number
}

function parseArgs(argv: string[]): Args {
  const raw: Record<string, string> = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (!a.startsWith('--')) continue
    const key = a.slice(2)
    const next = argv[i + 1]
    if (next && !next.startsWith('--')) {
      raw[key] = next
      i++
    } else {
      raw[key] = 'true'
    }
  }
  return {
    base: raw.base || 'development',
    out: raw.out || 'scratch/branch-review/index.html',
    includeStale: raw['include-stale'] === 'true',
    maxLoc: raw['max-loc'] ? parseInt(raw['max-loc'], 10) : 400,
    maxAgeDays: raw['max-age-days'] ? parseInt(raw['max-age-days'], 10) : null,
    extraNoise: raw['extra-noise']
      ? raw['extra-noise']
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [],
    overlapThreshold: raw['overlap-threshold']
      ? parseFloat(raw['overlap-threshold'])
      : 0.15,
  }
}

const USAGE = `branch-review — merge-planning dashboard

Usage:
  npm run generate:branch-review -- [flags]

Flags:
  --base <branch>            Integration branch to compare against (default: development)
  --out <path>              Output HTML path (default: scratch/branch-review/index.html;
                            gitignored. Point at docs-site/ only to publish publicly.)
  --include-stale           Keep branches with no unique commits (ahead === 0)
  --max-age-days <n>        Exclude branches whose tip commit is older than n days
  --max-loc <n>            Churn above which a branch is flagged oversized (default: 400)
  --extra-noise <a,b,c>     Extra basenames to treat as low-signal (beyond lockfiles/.gitignore/CHANGELOG)
  --overlap-threshold <0..1> Jaccard at/above which a pair is reported as overlapping (default: 0.15)
  -h, --help               Show this help

All git operations are read-only; no merges are performed.`

const CAVEATS = [
  'Conflict is a symmetric relation, not a dependency — there is no DAG and no true topological sort. The merge order is a greedy heuristic (minimizing total conflict cost is NP-hard), not a guaranteed-optimal schedule.',
  'merge-tree performs a textual/tree 3-way merge against the current branch tips — a snapshot in time. Once you land a branch, the base changes, so a pair that reads "clean" now can conflict later. Re-run after each merge.',
  'Textual-clean does not mean semantically correct: merge-tree cannot see behavioral conflicts (two branches editing different files that break each other at runtime), test failures, or logical incompatibilities.',
  'File overlap (Jaccard) only means two branches touch some of the same files — same file is not the same as a conflict, and disjoint files can still interact. Treat overlap as a prompt to look, corroborated by the conflict matrix.',
  'The merge order is driven by SUBSTANTIVE conflicts only. Pairs that collide solely on low-signal files (lockfiles, .gitignore, CHANGELOG) are shown as "trivial" in the matrix but do not form ordering edges — such conflicts are mechanical to resolve.',
  'Local branches only (refs/heads), as of generation time. Unpushed or stale state is included; remote-only branches are not.',
]

/** Print the headline findings to the terminal so the tool is useful without
 *  opening the HTML: the recommended order, near-duplicate branches, and the
 *  files that cause the most conflicts. */
function printHighlights(
  conflictMatrix: ConflictCell[],
  overlapMatrix: OverlapCell[],
  mergePlan: MergeStep[],
  isNoise: (p: string) => boolean,
): void {
  console.log('\n  recommended merge order:')
  const preview = mergePlan.slice(0, 8)
  for (const s of preview) {
    const tag = s.tier === 'independent' ? 'land now' : 'sequence'
    console.log(`    ${String(s.order).padStart(2)}. [${tag}] ${s.branch}`)
  }
  if (mergePlan.length > preview.length) {
    console.log(
      `    … +${mergePlan.length - preview.length} more (see dashboard)`,
    )
  }

  const dupes = overlapMatrix
    .filter((o) => o.jaccard >= 0.8)
    .sort((a, b) => b.jaccard - a.jaccard)
    .slice(0, 5)
  if (dupes.length) {
    console.log('\n  near-duplicate branches (≥80% file overlap):')
    for (const o of dupes) {
      console.log(`    ${Math.round(o.jaccard * 100)}%  ${o.a}  ∩  ${o.b}`)
    }
  }

  const counts = new Map<string, number>()
  for (const c of conflictMatrix) {
    if (c.status !== 'conflict') continue
    // Skip low-signal files — mechanical churn, not real hotspots.
    for (const f of c.conflictFiles) {
      if (isNoise(f)) continue
      counts.set(f, (counts.get(f) ?? 0) + 1)
    }
  }
  const hot = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)
  if (hot.length) {
    console.log('\n  top substantive conflict-hotspot files (pairs affected):')
    for (const [f, n] of hot) console.log(`    ${String(n).padStart(3)}  ${f}`)
  }
}

function main(): void {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(USAGE)
    return
  }
  const args = parseArgs(process.argv.slice(2))

  if (!refExists(args.base)) {
    console.error(
      `\nBase branch "${args.base}" does not exist in this repo. ` +
        'Pass an existing branch with --base <branch>.',
    )
    process.exit(1)
  }

  console.log('Branch review & merge-planning dashboard')
  console.log(`  base branch    : ${args.base}`)
  console.log(`  size threshold : ${args.maxLoc} LOC`)
  console.log(`  include stale  : ${args.includeStale}`)
  console.log(`  max age (days) : ${args.maxAgeDays ?? 'none'}`)
  process.stdout.write('  analyzing branches… ')

  const { branches, conflictMatrix, overlapMatrix, excludedByAge } = analyze(
    {
      base: args.base,
      sizeThreshold: args.maxLoc,
      includeStale: args.includeStale,
      maxAgeDays: args.maxAgeDays,
      extraNoise: args.extraNoise,
      sharedFilesCap: 40,
    },
    (done, total) => {
      process.stdout.write(`\r  analyzing pairs… ${done}/${total}   `)
    },
  )
  process.stdout.write('\n')

  if (branches.length === 0) {
    console.error(
      `\nNo candidate branches found against "${args.base}". ` +
        'Is the base branch name correct? Try --include-stale.',
    )
    process.exit(1)
  }

  const { clusters, mergePlan } = buildPlan(
    branches,
    conflictMatrix,
    overlapMatrix,
    { overlapThreshold: args.overlapThreshold },
  )

  const conflictPairs = conflictMatrix.filter(
    (c) => c.status === 'conflict',
  ).length
  const trivialPairs = conflictMatrix.filter((c) => c.trivialOnly).length
  const substantivePairs = conflictPairs - trivialPairs
  const cleanIntoBase = branches.filter((b) => b.mergesCleanIntoBase).length
  const oversized = branches.filter((b) => b.oversized).length
  const independent = mergePlan.filter((s) => s.tier === 'independent').length

  const data: BranchReviewData = {
    meta: {
      generatedAt: new Date().toISOString(),
      baseBranch: args.base,
      repoCommit: shortSha(args.base),
      generatorCommit: shortSha('HEAD'),
      branchCount: branches.length,
      pairCount: conflictMatrix.length,
      sizeThreshold: args.maxLoc,
      includeStale: args.includeStale,
      maxAgeDays: args.maxAgeDays,
      excludedByAge,
      gitVersion: gitVersion(),
    },
    branches,
    conflictMatrix,
    overlapMatrix,
    clusters,
    mergePlan,
    caveats: CAVEATS,
  }

  console.log(`  candidates     : ${branches.length}`)
  console.log(`  pairs compared : ${conflictMatrix.length}`)
  console.log(
    `  conflict pairs : ${conflictPairs} (${substantivePairs} substantive, ${trivialPairs} trivial)`,
  )
  console.log(`  clean into base: ${cleanIntoBase}/${branches.length}`)
  console.log(`  independent    : ${independent}`)
  console.log(`  oversized      : ${oversized}`)
  console.log(`  clusters       : ${clusters.length}`)
  if (excludedByAge > 0) {
    console.log(
      `  excluded (age) : ${excludedByAge} branch(es) older than ${args.maxAgeDays} days`,
    )
  }

  printHighlights(
    conflictMatrix,
    overlapMatrix,
    mergePlan,
    makeNoiseMatcher(args.extraNoise),
  )

  if (!fs.existsSync(TEMPLATE)) {
    console.error(`\nTemplate not found: ${TEMPLATE}`)
    process.exit(1)
  }
  const template = fs.readFileSync(TEMPLATE, 'utf8')
  if (!template.includes('__DATA__')) {
    console.error('\nTemplate is missing the __DATA__ placeholder')
    process.exit(1)
  }
  const payload = JSON.stringify(data).replace(/</g, '\\u003c')
  // Function replacement avoids `$&`/`$1` interpretation of `$` in the JSON.
  const html = template.replace('__DATA__', () => payload)

  const outPath = path.resolve(REPO_ROOT, args.out)
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, html)
  console.log(
    `\nwrote ${path.relative(REPO_ROOT, outPath)} (${(html.length / 1024).toFixed(0)} KB)`,
  )
  if (args.out.startsWith('docs-site/')) {
    console.log(
      '  ⚠ docs-site/ is deployed to a public Netlify site — branch names are now publishable.',
    )
  }
}

main()
