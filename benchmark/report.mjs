// Benchmark report runner: runs the suites, collects their JSON (via
// bench-run.mjs's BENCH_JSON hook) and renders a self-contained single-page
// HTML report. Ported from the cytoscape.js v4 harness.
//
//   npm run benchmark                    # quick profile
//   npm run benchmark -- --all           # + the standalone suites (db)
//   npm run benchmark -- --full          # + the 500/2k/10k matrix
//   npm run benchmark -- --renderer      # + the browser bench
//                                        #   (browser-bench.mjs: built dist
//                                        #   + Playwright chromium)
//   npm run benchmark -- --suite load
//   npm run benchmark -- --repeat 3      # publish per-row medians
//   npm run benchmark -- --jobs auto     # run jobs concurrently
//   npm run benchmark -- --render-only benchmark/results/results-<ts>.json
//
// Results land in benchmark/results/ (gitignored): a timestamped
// results-*.json plus report.html rendered from it.  --render-only
// re-renders an existing results file without re-running anything.
//
// **--repeat N runs each job N times and publishes the per-row median.** The
// v4 harness measured why (its rounds 65.11/65.12): single-run p50s move more
// run-to-run than the ±10% the comparison page flags at, so a single-run
// change table is noise; medians of three flag none of the identical-code
// pairs. Two is not enough — bimodal rows make a 2-run aggregate land between
// the modes — and best-of is worse than median, because it takes the fast
// mode whenever it appears. Each row also carries what the repeats measured
// about it — `stats.repeats` and `stats.repeatSpread` (max p50 / min p50) —
// so the comparison can screen a change against that row's own noise instead
// of one global threshold.
//
// **--jobs N runs N jobs at once.** The default is 1 and the serial path is
// the reference measurement. A concurrent run measures under contention —
// all-core turbo instead of single-core, a share of the L3 instead of all of
// it — so its jobs stamp a different harness hash (`concurrentHash`) and the
// comparison refuses to draw a line from a serial run to a parallel one. Use
// it for the iteration loop; read `benchmark/schedule.mjs` before publishing
// from one.

import { spawn } from 'node:child_process'
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  rmSync,
  existsSync,
} from 'node:fs'
import { dirname, join, resolve, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderReport } from './report-html.mjs'
import { buildMeta } from './run-meta.mjs'
import { stampHarness } from './harness-id.mjs'
import { mergeRepeats } from './repeat-merge.mjs'
import {
  canPin,
  criticalKeys,
  physicalCores,
  pickNext,
  planUnits,
  resolveWorkers,
} from './schedule.mjs'

const DIR = dirname(fileURLToPath(import.meta.url))
const RESULTS_DIR = join(DIR, 'results')

// -- job tables --------------------------------------------------------------
// Three tiers, so the default profile stays quick enough that people run it:
//
//   quick  — the model-layer suites at the default scale (N=2000 nodes,
//            3000 edges: 5000 elements)
//   --all  — + the standalone suites (db.mjs: fake-indexeddb persistence —
//            regression-sensitive, not real IndexedDB latency)
//   --full — + the 500/10000 matrix, bracketing the app thresholds
//            (layout ELE_THRESHOLD 1000; 10000n+15000e ≈ the 26000
//            maxNetworkElementsThreshold)
//
// `--suite <substr>` filters any of them, which is how a single sweep
// gets run and re-rendered on its own.
const QUICK_JOBS = [
  { file: 'load.mjs', n: 2000 },
  { file: 'serialization.mjs', n: 2000 },
  { file: 'table-edit.mjs', n: 2000 },
  { file: 'network-edit.mjs', n: 2000 },
  { file: 'render-transform.mjs', n: 2000 },
]

const STANDALONE_JOBS = [{ file: 'db.mjs', n: 2000 }]

const FULL_JOBS = [500, 10000].flatMap((n) =>
  QUICK_JOBS.map((j) => ({ ...j, n })),
)

// -- cli ---------------------------------------------------------------------
const argv = process.argv.slice(2)

function flagValue(name) {
  const i = argv.indexOf(name)

  return i >= 0 ? argv[i + 1] : null
}

const full = argv.includes('--full')
const all = argv.includes('--all')
const withRenderer = argv.includes('--renderer')
const suiteFilter = flagValue('--suite')
const sceneFilter = flagValue('--scene') // forwarded to the renderer bench
const renderOnly = flagValue('--render-only')
const repeat = Math.max(1, Number(flagValue('--repeat') ?? 1) || 1)
const jobsFlag = flagValue('--jobs') // a count, or 'auto'; absent is serial

function render(results, resultsPath) {
  const htmlPath = join(RESULTS_DIR, 'report.html')

  writeFileSync(htmlPath, renderReport(results))
  console.log(`\nreport:  ${htmlPath}`)
  console.log(`results: ${resultsPath}`)
}

mkdirSync(RESULTS_DIR, { recursive: true })

if (renderOnly) {
  const path = resolve(renderOnly)

  render(JSON.parse(readFileSync(path, 'utf8')), path)
  process.exit(0)
}

// -- run ---------------------------------------------------------------------
let jobs = [...QUICK_JOBS]

if (all) {
  jobs = [...jobs, ...STANDALONE_JOBS]
}
if (full) {
  jobs = [...jobs, ...FULL_JOBS]
}

if (suiteFilter != null) {
  jobs = jobs.filter((j) => j.file.includes(suiteFilter))
}

// the browser-side benchmark (browser-bench.mjs: built dist + Playwright
// chromium required) appends its own scenario jobs to the same results file
if (withRenderer) {
  jobs = [...jobs, { file: 'browser-bench.mjs', browser: true }]
}

if (jobs.length === 0) {
  console.error(`no jobs match --suite ${suiteFilter}`)
  process.exit(1)
}

const startedAt = Date.now()
const results = { meta: null, jobs: [] }
const failures = []
let rendererAdapter = null

const ROOT = resolve(DIR, '..')
const cores = physicalCores()
const workers = Math.min(
  resolveWorkers(jobsFlag, cores),
  Math.max(1, jobs.length * repeat),
)
const pin = workers > 1 && cores.length > 0 && canPin()

if (workers > 1) {
  console.log(
    `${workers} workers` +
      (pin ? `, pinned to cpu ${cores.slice(0, workers).join(',')}` : '') +
      ' — a concurrent run measures under contention and is its own epoch;' +
      ' it does not compare against the serial archive',
  )

  if (full) {
    console.warn(
      '  warning: --full builds 200k-element graphs, several GB per process —' +
        ' check the memory headroom before raising --jobs here',
    )
  }
}

const labelOf = (job) =>
  job.browser
    ? `${job.file} (browser)`
    : `${job.file} @ N=${job.n}${job.op ? ` op=${job.op}` : ''}`

// -- the duration cache ------------------------------------------------------
// Ordering only: the scheduler starts the longest jobs first, and without a
// hint it learns each job's length from that job's own first pass — which is
// one pass too late for the first pass.  The file is written into the
// gitignored results directory, is never read by anything that renders a
// number, and a missing or corrupt one costs packing rather than correctness.
// (Hints recorded under `--jobs N` are inflated by the contention they were
// measured in.  That is fine for a comparator and is why they are not used
// for anything else.)
const HINTS_PATH = join(RESULTS_DIR, '.durations.json')

function readHints() {
  try {
    return new Map(
      Object.entries(JSON.parse(readFileSync(HINTS_PATH, 'utf8'))).filter(
        ([, v]) => typeof v === 'number' && v > 0,
      ),
    )
  } catch {
    return new Map()
  }
}

function writeHints(hints) {
  try {
    writeFileSync(
      HINTS_PATH,
      JSON.stringify(Object.fromEntries([...hints].sort()), null, 2),
    )
  } catch {
    // a cache that cannot be written is a slower schedule, not a failed run
  }
}

// -- the pool ----------------------------------------------------------------
// Each unit is one (job, pass) in its own process, which is the point: round
// 65.11 traced the bistable rows to per-process JIT/heap state, so repeating
// inside one process would sample the same state N times and report a noise
// band of zero — a screen that always passes is worse than none.
const hints = readHints()
const units = planUnits(jobs, repeat, workers > 1)
const collected = jobs.map(() => [])
const total = units.length
let finished = 0

async function runPool() {
  const pending = [...units]
  const running = new Map() // slot -> unit
  const freeSlots = Array.from({ length: workers }, (_, i) => i)

  // which jobs' repeats may overlap, recomputed as the queue drains: a chain
  // stops being critical once enough of it has run.  Announced once per job,
  // because a narrowed repeat band that nobody was told about is the kind of
  // thing this harness exists to prevent.
  const announced = new Set()
  const criticalNow = () => {
    const keys = workers > 1 ? criticalKeys(pending, hints, workers) : new Set()

    for (const key of keys) {
      if (!announced.has(key)) {
        announced.add(key)
        console.log(
          `  note: overlapping the repeats of ${key} — its chain is longer` +
            ' than the rest of the run; its repeat band will be correlated',
        )
      }
    }

    return keys
  }

  await new Promise((done) => {
    const pump = () => {
      while (freeSlots.length > 0) {
        const at = pickNext(pending, {
          running: [...running.values()],
          hints,
          critical: criticalNow(),
        })

        if (at < 0) {
          break
        }

        const [unit] = pending.splice(at, 1)
        const slot = freeSlots.shift()

        running.set(slot, unit)
        start(unit, slot, () => {
          running.delete(slot)
          freeSlots.push(slot)
          pump()
        })
      }

      if (running.size === 0 && pending.length === 0) {
        done()
      }
    }

    const start = (unit, slot, release) => {
      const { job, index, pass } = unit
      const label = labelOf(job)
      const jsonPath = join(RESULTS_DIR, `.job-${index}-${pass}.json`)
      const core = pin ? cores[slot % cores.length] : null
      const args = job.browser
        ? [
            '--import',
            'tsx',
            join(DIR, job.file),
            '--json',
            jsonPath,
            ...(sceneFilter != null ? ['--scene', sceneFilter] : []),
          ]
        : ['--import', 'tsx', join(DIR, job.file)]
      const suffix = repeat > 1 ? ` (pass ${pass + 1}/${repeat})` : ''

      if (workers === 1) {
        console.log(`\n[${total - pending.length}/${total}] ${label}${suffix}`)
      } else {
        console.log(
          `  > ${label}${suffix}${core != null ? ` [cpu ${core}]` : ''}`,
        )
      }

      const t0 = Date.now()
      const child = spawn(
        core != null ? 'taskset' : process.execPath,
        core != null
          ? ['-c', String(core), process.execPath, ...args]
          : [...args],
        {
          cwd: ROOT,
          // a serial run keeps mitata's live output, exactly as before; a
          // concurrent one would interleave eight suites into nonsense, so it
          // captures instead and prints the tail of whatever failed
          stdio: workers === 1 ? 'inherit' : ['ignore', 'pipe', 'pipe'],
          env: job.browser
            ? process.env
            : {
                ...process.env,
                BENCH_N: String(job.n),
                ...(job.op != null ? { BENCH_OP: job.op } : {}),
                BENCH_JSON: jsonPath,
              },
        },
      )

      let tail = ''
      const keep = (chunk) => {
        tail = `${tail}${chunk}`.slice(-4000)
      }

      child.stdout?.on('data', keep)
      child.stderr?.on('data', keep)

      child.on('close', (code) => {
        const durationMs = Date.now() - t0

        finished++

        if (code !== 0 || !existsSync(jsonPath)) {
          console.error(
            `  FAILED (exit ${code}) ${label}${suffix}` +
              (tail === '' ? '' : `\n${tail}`),
          )
          failures.push({ job: label, exitCode: code })
          release()

          return
        }

        const data = JSON.parse(readFileSync(jsonPath, 'utf8'))

        rmSync(jsonPath)
        hints.set(unit.key, durationMs)
        collected[index][pass] = job.browser ? data : { ...data, durationMs }

        if (workers > 1) {
          console.log(
            `  ok ${finished}/${total} ${label}${suffix} ` +
              `${(durationMs / 1000).toFixed(1)}s`,
          )
        }

        release()
      })
    }

    pump()
  })
}

await runPool()
writeHints(hints)

// jobs land in declaration order however the pool ran them, so the results
// file — and every report and comparison rendered from it — is unchanged by
// the scheduling
for (const [i, job] of jobs.entries()) {
  const passes = collected[i].filter((p) => p != null)

  if (job.browser) {
    // a jobs bundle: one job per scene, durations set scene-side, so the
    // repeats are merged per scene rather than per job
    const bySuite = new Map()

    for (const bundle of passes) {
      for (const j of bundle.jobs ?? []) {
        bySuite.set(j.suite, [...(bySuite.get(j.suite) ?? []), j])
      }

      failures.push(...(bundle.failures ?? []))
      // which GPU actually rendered — captured browser-side, and until round
      // 46.5 discarded at this boundary
      rendererAdapter = bundle.adapter ?? rendererAdapter
    }

    for (const list of bySuite.values()) {
      const m = mergeRepeats(list)

      if (m != null) {
        results.jobs.push(m)
      }
    }
  } else {
    const m = mergeRepeats(passes)

    if (m != null) {
      results.jobs.push(m)
    }
  }
}

// every job carries the fingerprint of the harness that produced it, so the
// comparison can refuse a change across a methodology break the way it already
// refuses one across machines (benchmark/harness-id.mjs) — and since round 68
// that includes the contention a concurrent run measured under
stampHarness(results.jobs, null, { workers })

const context = results.jobs[0]?.context ?? {}

results.meta = buildMeta({
  startedAt,
  profile: full ? 'full' : all ? 'all' : 'quick',
  suiteFilter,
  repeat,
  concurrency: workers,
  failures,
  context,
  // a --renderer run carries the adapter through the browser job's bundle;
  // a pure CPU run has none, and null is the honest answer
  adapter: rendererAdapter,
})

const stamp = results.meta.date.replace(/[:.]/g, '-')
const resultsPath = join(RESULTS_DIR, `results-${stamp}.json`)

writeFileSync(resultsPath, JSON.stringify(results, null, 2))
render(results, resultsPath)

if (failures.length > 0) {
  console.error(
    `\n${failures.length} job(s) failed: ${failures.map((f) => f.job).join('; ')}`,
  )
}

console.log(
  `total: ${(results.meta.totalMs / 60000).toFixed(1)} min (${basename(resultsPath)})`,
)
