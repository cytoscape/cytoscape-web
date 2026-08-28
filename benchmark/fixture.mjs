// Shared fixtures for the benchmark suites (the v4 harness's graph.mjs role).
//
// Everything here is deterministic and generated at bench time — nothing is
// committed. Fixtures come from the same generator the test fixtures use
// (`scripts/generate-test-fixtures/generate-cx2.ts`), sized by BENCH_N, plus
// one committed *real* NDEx network for attribute/style density no synthetic
// fixture has.
//
// App-library imports go through `@/` (never `../`) on purpose: harness-id
// follows only `./`-relative imports, so the harness hash tracks the
// instrument (these files) and not the subject (`src/`).

import './bench-env.mjs'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join, dirname } from 'node:path'
import { generateValidCx2 } from '../scripts/generate-test-fixtures/generate-cx2'
import { createCyNetworkFromCx2 } from '@/models/CxModel/impl'
import cytoscape from 'cytoscape'
import { N, E } from './bench-size.mjs'

export { N, E, MIDNUM, MID } from './bench-size.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

/** The committed real NDEx network: 336 nodes / 11913 edges, 2.5 MB of CX2. */
const REAL_NETWORK_PATH = join(
  ROOT,
  'test/fixtures/ndex/88521140-6a12-11ef-b816-005056ae6f73.valid.cx2',
)

const cx2Cache = new Map()

/**
 * A deterministic CX2 network at bench scale. Layout, attribute declarations,
 * network attributes, node/edge attributes and a visual-properties aspect are
 * all on by default so conversion exercises every sub-converter; pass false
 * to bench a leaner document. Cached per option set — callers that mutate
 * must clone (`cloneCx2`).
 */
export function makeCx2({
  nodes = N,
  edges = E,
  withLayout = true,
  withVisualStyle = true,
  withAttributes = true,
} = {}) {
  const key = `${nodes}|${edges}|${withLayout}|${withVisualStyle}|${withAttributes}`
  let cx2 = cx2Cache.get(key)

  if (cx2 == null) {
    cx2 = generateValidCx2({
      nodeCount: nodes,
      edgeCount: edges,
      withLayout,
      withVisualStyle,
      withAttributes,
      withOpaqueAspects: false,
      withNetworkAttributes: true,
      withAttributeDeclarations: true,
    })
    cx2Cache.set(key, cx2)
  }

  return cx2
}

export const cloneCx2 = (cx2) => structuredClone(cx2)

/**
 * A rotation pool: k structurally identical CX2 documents with distinct
 * object identity, so a bench can rotate operands and V8 cannot specialise
 * on (or hoist a pure call over) a single object.
 */
export function cx2Pool(k = 4, opts) {
  const base = makeCx2(opts)

  return Array.from({ length: k }, () => cloneCx2(base))
}

const modelCache = new Map()

/**
 * The converted models for a generated CX2 at bench scale: the full CyNetwork
 * `{ network, nodeTable, edgeTable, visualStyle, visualStyleSet,
 * networkViews, networkAttributes, ... }`. Converted once per option set and
 * cached — treat the result as read-only; suites that mutate must build
 * dedicated instances.
 */
export function makeCyModels(opts) {
  const key = JSON.stringify(opts ?? null)
  let models = modelCache.get(key)

  if (models == null) {
    models = createCyNetworkFromCx2(opts?.id ?? 'bench-network', makeCx2(opts))
    modelCache.set(key, models)
  }

  return models
}

/**
 * The converted default visual style with one mapping of each kind installed
 * (the generated CX2's own style has none): passthrough on the name column,
 * discrete on `type`, continuous on `score`. This is what makes the
 * render-transform suite's mapping hot loop evaluate real mappers instead of
 * defaults-only.
 */
export function makeMappedVisualStyle(opts) {
  const style = structuredClone(makeCyModels(opts).visualStyle)

  style.nodeLabel.mapping = {
    type: 'passthrough',
    attribute: 'n',
    visualPropertyType: 'string',
    defaultValue: '',
  }
  style.nodeBackgroundColor.mapping = {
    type: 'discrete',
    attribute: 'type',
    visualPropertyType: 'color',
    defaultValue: '#999999',
    vpValueMap: new Map([
      ['protein', '#4488CC'],
      ['gene', '#CC8844'],
    ]),
  }
  style.nodeHeight.mapping = {
    type: 'continuous',
    attribute: 'score',
    visualPropertyType: 'number',
    attributeType: 'double',
    defaultValue: 40,
    min: { value: 0, vpValue: 10, inclusive: true },
    max: { value: 1000, vpValue: 80, inclusive: true },
    controlPoints: [
      { value: 0, vpValue: 10, inclusive: true },
      { value: 1000, vpValue: 80, inclusive: true },
    ],
    gtMaxVpValue: 80,
    ltMinVpValue: 10,
  }

  return style
}

let realCx2 = null

/** The committed NDEx fixture, parsed once. Fixed size — ignores BENCH_N. */
export function realNetworkCx2() {
  realCx2 ??= JSON.parse(readFileSync(REAL_NETWORK_PATH, 'utf8'))

  return realCx2
}

/** A fresh headless cytoscape instance (the CyjsRenderer transform target). */
export function freshHeadlessCy() {
  return cytoscape({ headless: true, styleEnabled: true })
}
