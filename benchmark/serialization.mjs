// Serialization sweep: the model ↔ IndexedDB-row conversions, at BENCH_N
// scale.
//
//   node --import tsx benchmark/serialization.mjs
//   BENCH_OP=table node --import tsx benchmark/serialization.mjs
//
// What would make these numbers move: `serializeTable`/`deserializeTable`
// walk every row (Map ↔ record entries, rich-value encoding), so row count
// and attribute density drive them; `toPlainObject` is the manual deep copy
// every store-to-DB write pays for Immer proxies. These run on EVERY
// persisted mutation (`putTablesToDb` currently serializes each table three
// times per write — the db suite's tripwire), so a regression here is a
// regression in editing latency, not just save time.
//
// Methodology: pure functions over a rotation pool of cloned models; the
// `control` row is a structuredClone of the same operand.

import './bench-env.mjs'
import { bench, group, summary, do_not_optimize } from 'mitata'
import { finishRun } from './bench-run.mjs'
import { makeCyModels, N } from './fixture.mjs'
// the serialization barrel re-exports via `export *`, which compiles to a
// CJS __exportStar the ESM named-import lexer cannot see through — import
// the concrete modules instead
import {
  serializeTable,
  deserializeTable,
  serializeNetworkView,
  deserializeNetworkView,
  serializeVisualStyle,
  deserializeVisualStyle,
} from '@/data/db/serialization/mapSerialization'
import { toPlainObject } from '@/data/db/serialization/immerSerialization'

const OP = process.env.BENCH_OP
const has = (name) => OP == null || name.includes(OP)

const K = 4
const MASK = K - 1
const models = makeCyModels()
let i = 0

/** K clones with distinct identity, so operands rotate. */
const pool = (value) => Array.from({ length: K }, () => structuredClone(value))

/**
 * Register a group over a rotation pool plus the frozen control row.
 * `rows` is `{ benchName: (operand, k) => result }`; every row pre-warms
 * over the pool before any row samples.
 */
function serGroup(name, operandPool, rows) {
  if (!has(name)) {
    return
  }

  const entries = Object.entries(rows)

  for (let w = 0; w < 2 * K; w++) {
    for (const [, fn] of entries) {
      do_not_optimize(fn(operandPool[w & MASK], w & MASK))
    }
  }

  group(name, () => {
    summary(() => {
      for (const [rowName, fn] of entries) {
        bench(rowName, () => {
          const k = i++ & MASK

          return do_not_optimize(fn(operandPool[k], k))
        })
      }
      bench('control', () => {
        return do_not_optimize(structuredClone(operandPool[i++ & MASK]))
      })
    })
  })
}

console.log(`\n== serialization sweep (N=${N} node rows) ==`)

const nodeTables = pool(models.nodeTable)
const serializedTables = nodeTables.map((t) => serializeTable(t))

serGroup('serialize: table', nodeTables, {
  serializeTable: (t) => serializeTable(t),
  toPlainObject: (t) => toPlainObject(t),
})

serGroup('serialize: table (from rows)', serializedTables, {
  deserializeTable: (t) => deserializeTable(t),
})

const views = pool(models.networkViews[0])
const serializedViews = views.map((v) => serializeNetworkView(v))

serGroup('serialize: network view', views, {
  serializeNetworkView: (v) => serializeNetworkView(v),
})

serGroup('serialize: network view (from rows)', serializedViews, {
  deserializeNetworkView: (v) => deserializeNetworkView(v),
})

const styles = pool(models.visualStyle)
const serializedStyles = styles.map((s) => serializeVisualStyle(s))

serGroup('serialize: visual style', styles, {
  serializeVisualStyle: (s) => serializeVisualStyle(s),
})

serGroup('serialize: visual style (from rows)', serializedStyles, {
  deserializeVisualStyle: (s) => deserializeVisualStyle(s),
})

await finishRun('serialization')
