// Table-editing sweep: the pure TableModel primitives every attribute edit
// goes through, at BENCH_N rows.
//
//   node --import tsx benchmark/table-edit.mjs
//   BENCH_OP=bulk node --import tsx benchmark/table-edit.mjs
//
// What would make these numbers move: every one of these functions copies
// the whole rows Map (immutable update), so ALL of them are O(rows) — the
// interesting signal is the constant. `setValue` (one cell) pays nearly the
// same Map copy as `setValues` over every row; if the store ever moves to
// structural sharing, the `single` group is where it shows. Column ops
// additionally copy every row record.
//
// Methodology: the inputs are immutable (each call returns a new Table and
// leaves its input untouched), so operands are naturally reusable — no
// reversal needed. Operands rotate over a pool of K table clones; `control`
// is the bare rows-Map copy (`new Map(rows)`), the floor every operation
// pays before doing any work.

import './bench-env.mjs'
import { bench, group, summary, do_not_optimize } from 'mitata'
import { finishRun } from './bench-run.mjs'
import { makeCyModels, N, MID } from './fixture.mjs'

const OP = process.env.BENCH_OP
const has = (name) => OP == null || name.includes(OP)

const TableImpl = await import('@/models/TableModel/impl/inMemoryTable')

const K = 4
const MASK = K - 1
const tables = Array.from({ length: K }, () =>
  structuredClone(makeCyModels().nodeTable),
)
let i = 0

function tableGroup(name, rows) {
  if (!has(name)) {
    return
  }

  const entries = Object.entries(rows)

  for (let w = 0; w < 2 * K; w++) {
    for (const [, fn] of entries) {
      do_not_optimize(fn(tables[w & MASK], w & MASK))
    }
  }

  group(name, () => {
    summary(() => {
      for (const [rowName, fn] of entries) {
        bench(rowName, () => {
          const k = i++ & MASK

          return do_not_optimize(fn(tables[k], k))
        })
      }
      bench('control', () => {
        return do_not_optimize(new Map(tables[i++ & MASK].rows))
      })
    })
  })
}

console.log(`\n== table-edit sweep (N=${N} rows) ==`)

// operands resolved outside the timed region
const batchIds = Array.from({ length: Math.max(1, N / 10) }, (_, j) =>
  String((j * 7) % N),
)
const newRowPairs = Array.from({ length: Math.max(1, N / 10) }, (_, j) => [
  `new-${j}`,
  { n: `node-new-${j}`, type: 'protein', score: j * 0.1 },
])
const cellEditsPool = tables.map((t) =>
  [...t.rows.keys()].map((rowId, j) => ({
    row: rowId,
    column: 'score',
    value: j * 0.01,
  })),
)
const editedRowsPool = tables.map(
  (t) =>
    new Map(
      [...t.rows.entries()]
        .slice(0, Math.max(1, N / 10))
        .map(([id, row]) => [id, { ...row, type: 'edited' }]),
    ),
)

tableGroup('table-edit: bulk', {
  [`insertRows (${newRowPairs.length})`]: (t) =>
    TableImpl.insertRows(t, newRowPairs),
  [`deleteRows (${batchIds.length})`]: (t) => TableImpl.deleteRows(t, batchIds),
  'setValues (every row)': (t, k) => TableImpl.setValues(t, cellEditsPool[k]),
  'applyValueToElements (every row)': (t) =>
    TableImpl.applyValueToElements(t, 'type', 'flagged'),
  [`editRows (${Math.max(1, N / 10)})`]: (t, k) =>
    TableImpl.editRows(t, editedRowsPool[k]),
})

tableGroup('table-edit: single', {
  'setValue (one cell)': (t, k) => TableImpl.setValue(t, MID, 'score', k * 0.5),
  'insertRow (one row)': (t, k) =>
    TableImpl.insertRow(t, [`single-${k}`, { n: 'x', score: k }]),
  'addRowWithDefaults (one row)': (t, k) =>
    TableImpl.addRowWithDefaults(t, `dflt-${k}`),
})

tableGroup('table-edit: columns', {
  'createColumn (fill every row)': (t, k) =>
    TableImpl.createColumn(t, `col-${k}`, 'string', 'v'),
  duplicateColumn: (t) => TableImpl.duplicateColumn(t, 'score'),
  deleteColumn: (t) => TableImpl.deleteColumn(t, 'score'),
  moveColumn: (t) => TableImpl.moveColumn(t, 0, 1),
})

await finishRun('table-edit')
