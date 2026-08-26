// Persistence sweep: the IndexedDB layer under fake-indexeddb, at BENCH_N
// scale. Standalone (part of --all, not the quick profile).
//
//   node --import tsx benchmark/db.mjs
//   BENCH_OP='db: put' node --import tsx benchmark/db.mjs
//
// **fake-indexeddb is not real IndexedDB latency.** These rows measure the
// serialization work, the transaction/await structure, and fake-idb's
// in-memory bookkeeping — the same substitute the unit suite runs against.
// They are regression-sensitive (a new copy, a new await chain, a doubled
// serialize shows up), not absolute: real-browser persistence cost belongs
// to the browser bench.
//
// What would make these numbers move: `putTablesToDb` currently serializes
// EACH table three times per write (twice inside a logDb.info argument list
// that is evaluated even when the logger is off, once for the actual put) —
// its row is the tripwire for fixing that. `putNetworkToDb` silently
// materializes the whole topology through the live `network.nodes`/`.edges`
// getters. `getCyNetworkFromDb` is seven sequential awaits — parallelizing
// them is a measurable candidate.
//
// Methodology: puts rotate over K row ids so every iteration overwrites a
// warm row of the same shape; the get group reads rows seeded once outside
// the timed region. `control` structuredClones the serialized node table —
// the library-free floor of a table write.

import './bench-env.mjs'
import { bench, group, summary, do_not_optimize } from 'mitata'
import { finishRun } from './bench-run.mjs'
import { makeCyModels, N } from './fixture.mjs'
import { serializeTable } from '@/data/db/serialization/mapSerialization'

const dbModule = await import('@/data/db')
const {
  initializeDb,
  putNetworkToDb,
  putTablesToDb,
  putNetworkViewsToDb,
  putVisualStyleSetToDb,
  getCyNetworkFromDb,
} = dbModule

const OP = process.env.BENCH_OP
const has = (name) => OP == null || name.includes(OP)

const K = 4
const MASK = K - 1
const models = makeCyModels()
const serializedNodeTable = serializeTable(models.nodeTable)
let i = 0

console.log(`\n== db sweep (N=${N} nodes; fake-indexeddb, not real latency) ==`)

await initializeDb()

// each pool slot needs its own db rows: the rows are keyed by the network
// id (putNetworkToDb reads network.id), so convert one network per slot id
const slotModels = Array.from({ length: K }, (_, k) =>
  makeCyModels({ id: `bench-db-${k}` }),
)

// seed every slot once, outside the timed region, so gets read warm rows and
// puts overwrite rows of the same shape
for (let k = 0; k < K; k++) {
  const m = slotModels[k]

  await putNetworkToDb(m.network)
  await putTablesToDb(m.network.id, m.nodeTable, m.edgeTable)
  await putNetworkViewsToDb(m.network.id, m.networkViews)
  await putVisualStyleSetToDb(m.network.id, m.visualStyleSet)
}

if (has('db: put')) {
  group('db: put', () => {
    summary(() => {
      bench('putNetworkToDb', async () => {
        await putNetworkToDb(slotModels[i++ & MASK].network)
      })
      bench('putTablesToDb (3x serialize tripwire)', async () => {
        const m = slotModels[i++ & MASK]

        await putTablesToDb(m.network.id, m.nodeTable, m.edgeTable)
      })
      bench('putNetworkViewsToDb', async () => {
        const m = slotModels[i++ & MASK]

        await putNetworkViewsToDb(m.network.id, m.networkViews)
      })
      bench('putVisualStyleSetToDb', async () => {
        const m = slotModels[i++ & MASK]

        await putVisualStyleSetToDb(m.network.id, m.visualStyleSet)
      })
      bench('control', () => {
        return do_not_optimize(structuredClone(serializedNodeTable))
      })
    })
  })
}

if (has('db: get')) {
  group('db: get', () => {
    summary(() => {
      bench('getCyNetworkFromDb (7 sequential awaits)', async () => {
        return do_not_optimize(
          await getCyNetworkFromDb(slotModels[i++ & MASK].network.id),
        )
      })
      bench('control', () => {
        return do_not_optimize(structuredClone(serializedNodeTable))
      })
    })
  })
}

if (has('db: round-trip')) {
  group('db: round-trip', () => {
    summary(() => {
      bench('put tables + network, get whole network', async () => {
        const m = slotModels[i++ & MASK]

        await putNetworkToDb(m.network)
        await putTablesToDb(m.network.id, m.nodeTable, m.edgeTable)

        return do_not_optimize(await getCyNetworkFromDb(m.network.id))
      })
    })
  })
}

await finishRun('db')

// dexie keeps its connection open; exit rather than linger
process.exit(0)
