// Loading sweep: CX2 → model conversion and back, at BENCH_N scale.
//
//   node --import tsx benchmark/load.mjs
//   BENCH_N=10000 node --import tsx benchmark/load.mjs
//   BENCH_OP=convert node --import tsx benchmark/load.mjs
//
// What would make these numbers move: the validator walks every element and
// builds zod schemas per declared attribute (`validateCx2Attributes`), so
// element count and attribute density drive `validate`; `convert` adds a
// headless cytoscape instantiation per call plus Map-building for tables and
// views, so it also tracks cytoscape's add() cost; `export` re-walks the
// converted models. The `convert-real` group pins the one committed dense
// NDEx network (336 n / 11913 e, real attribute+style density) and ignores
// BENCH_N — it runs only at the default size so the FULL matrix does not
// re-measure an N-independent row.
//
// Methodology (see docs/agents/benchmarking.md): operands come from a
// rotation pool of K clones resolved outside the timed region; every row is
// pre-warmed before any row samples; `control` is a frozen, library-free
// operation on the same operand (structuredClone of the document) that
// serves as the per-row noise control in cross-run comparisons.

import './bench-env.mjs'
import { bench, group, summary, do_not_optimize } from 'mitata'
import { finishRun } from './bench-run.mjs'
import { cx2Pool, realNetworkCx2, N } from './fixture.mjs'
import {
  createCyNetworkFromCx2,
  getCyNetworkFromCx2,
  exportCyNetworkToCx2,
} from '@/models/CxModel/impl'
import {
  validateCX2,
  validateCx2Structure,
  validateCx2Metadata,
  validateCx2ReferentialIntegrity,
  validateCx2Attributes,
} from '@/models/CxModel/impl/validator'
import {
  createNetworkFromCx,
  createTablesFromCx,
  createViewModelFromCX,
  createVisualStyleFromCx,
  createNetworkAttributesFromCx,
} from '@/models/CxModel/impl/converters'

const OP = process.env.BENCH_OP
const has = (name) => OP == null || name.includes(OP)

const K = 4
const MASK = K - 1
const pool = cx2Pool(K)
const DEFAULT_N = 2000

// One rotation counter per suite; a group() body registers rows that share
// it, so consecutive samples of one row still see rotating operands.
let i = 0

/**
 * Register a group of benches over the CX2 rotation pool, plus the frozen
 * `control` row. Every row is pre-warmed over the pool before any row
 * samples, so no row measures colder inline caches than its neighbours.
 * `rows` is `{ benchName: (cx2, k) => result }`.
 */
function cxGroup(name, rows) {
  if (!has(name)) {
    return
  }

  const entries = Object.entries(rows)

  for (let w = 0; w < 2 * K; w++) {
    for (const [, fn] of entries) {
      do_not_optimize(fn(pool[w & MASK], w & MASK))
    }
  }

  group(name, () => {
    summary(() => {
      for (const [rowName, fn] of entries) {
        bench(rowName, () => {
          const k = i++ & MASK

          return do_not_optimize(fn(pool[k], k))
        })
      }
      bench('control', () => {
        return do_not_optimize(structuredClone(pool[i++ & MASK]))
      })
    })
  })
}

console.log(
  `\n== loading sweep (N=${N} nodes, ${Math.round(N * 1.5)} edges) ==`,
)

cxGroup('load: validate', {
  'validateCX2 (full)': (cx2) => validateCX2(cx2),
  structure: (cx2) => validateCx2Structure(cx2),
  metadata: (cx2) => validateCx2Metadata(cx2),
  'referential integrity': (cx2) => validateCx2ReferentialIntegrity(cx2),
  attributes: (cx2) => validateCx2Attributes(cx2),
})

cxGroup('load: convert', {
  'getCyNetworkFromCx2 (validate + convert)': (cx2, k) =>
    getCyNetworkFromCx2(`bench-${k}`, cx2),
  createCyNetworkFromCx2: (cx2, k) => createCyNetworkFromCx2(`bench-${k}`, cx2),
})

cxGroup('load: convert-aspects', {
  network: (cx2, k) => createNetworkFromCx(`bench-${k}`, cx2),
  tables: (cx2, k) => createTablesFromCx(`bench-${k}`, cx2),
  'visual style': (cx2) => createVisualStyleFromCx(cx2),
  'view model': (cx2, k) => createViewModelFromCX(`bench-${k}`, cx2),
  'network attributes': (cx2, k) =>
    createNetworkAttributesFromCx(`bench-${k}`, cx2),
})

// Fixed-size real network — N-independent, so skip in scaled runs.
if (N === DEFAULT_N && has('load: convert-real')) {
  const real = Array.from({ length: K }, () =>
    structuredClone(realNetworkCx2()),
  )

  for (let w = 0; w < 2 * K; w++) {
    do_not_optimize(getCyNetworkFromCx2(`real-${w & MASK}`, real[w & MASK]))
  }

  group('load: convert-real (NDEx 336n/11913e)', () => {
    summary(() => {
      bench('getCyNetworkFromCx2', () => {
        const k = i++ & MASK

        return do_not_optimize(getCyNetworkFromCx2(`real-${k}`, real[k]))
      })
      bench('control', () => {
        return do_not_optimize(structuredClone(real[i++ & MASK]))
      })
    })
  })
}

if (has('load: export')) {
  const models = Array.from({ length: K }, (_, k) =>
    createCyNetworkFromCx2(`export-${k}`, pool[k]),
  )

  for (let w = 0; w < 2 * K; w++) {
    do_not_optimize(exportCyNetworkToCx2(models[w & MASK]))
  }

  group('load: export', () => {
    summary(() => {
      bench('exportCyNetworkToCx2', () => {
        return do_not_optimize(exportCyNetworkToCx2(models[i++ & MASK]))
      })
      bench('control', () => {
        return do_not_optimize(structuredClone(pool[i++ & MASK]))
      })
    })
  })
}

await finishRun('load')
