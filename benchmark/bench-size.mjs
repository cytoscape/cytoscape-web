// The benchmark run size, and the constants derived from it.
//
// Deliberately importless (the cytoscape.js v4 harness convention): anything
// that wants only the run size — bench-run.mjs, specs about report rendering —
// must be able to read it without evaluating the app, its fixture generator,
// or cytoscape itself.

/** Node count, overridable so a run can be scaled: `BENCH_N=10000 npm run benchmark` */
export const N = Number(process.env.BENCH_N) || 2000

/** Edge count: 1.5 edges per node, so the default fixture is N * 2.5 elements. */
export const E = Math.round(N * 1.5)

/** The index of the middle node — the one single-element rows address. */
export const MIDNUM = Math.floor(N / 2)

/** That node's id. CX2 node ids are numeric; cytoscape-web IdType is string. */
export const MID = String(MIDNUM)
