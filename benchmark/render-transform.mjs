// Render-transform sweep: the CyjsRenderer pipeline that turns models into
// what cytoscape.js draws, run outside React at BENCH_N scale.
//
//   node --import tsx benchmark/render-transform.mjs
//   BENCH_OP=apply-style node --import tsx benchmark/render-transform.mjs
//
// This is the loop `CyjsRenderer.tsx` re-runs every time the vizmapper,
// table data, or network data changes (and `renderStylePreview.ts` runs
// headlessly for thumbnails): applyVisualStyle → createCyjsDataMapper →
// addCyElements → applyViewModel.
//
// What would make these numbers move: `applyVisualStyle` evaluates every
// mapped visual property per element (the fixture's style carries one
// passthrough, one discrete, and one continuous mapping so the mappers are
// real, not defaults-only); `addCyElements`/`applyViewModel` pay cytoscape
// element creation and per-element data() writes. `createCyjsDataMapper` is
// per-property, not per-element — flat across N by design; it moves only
// when the style system changes.
//
// Methodology: view-model production is pure (fresh output per call), so
// those rows rotate operands from a pool. The cy-instance rows mutate: each
// timed `addCyElements` runs against an emptied instance (`cy.elements()
// .remove()` in the same iteration — a remove the row's name declares), and
// `applyViewModel` is idempotent on a pre-populated instance. `control`
// iterates the node views summing coordinates.

import './bench-env.mjs'
import { bench, group, summary, do_not_optimize } from 'mitata'
import { finishRun } from './bench-run.mjs'
import {
  makeCyModels,
  makeMappedVisualStyle,
  freshHeadlessCy,
  N,
} from './fixture.mjs'
import {
  createNewNetworkView,
  updateNetworkView,
} from '@/models/VisualStyleModel/impl/computeViewUtil'
import {
  createCyjsDataMapper,
  applyViewModel,
} from '@/features/NetworkPanel/CyjsRenderer/cyjsRenderUtil'
import { addCyElements } from '@/features/NetworkPanel/CyjsRenderer/cyjsFactoryUtil'

const OP = process.env.BENCH_OP
const has = (name) => OP == null || name.includes(OP)

const EDITOR_PROPERTIES = {
  nodeSizeLocked: false,
  arrowColorMatchesEdge: false,
  tableDisplayConfiguration: {
    nodeTable: { columnConfiguration: [] },
    edgeTable: { columnConfiguration: [] },
  },
}

const K = 4
const MASK = K - 1
const models = makeCyModels()
const mappedStyle = makeMappedVisualStyle()
let i = 0

console.log(`\n== render-transform sweep (N=${N} nodes) ==`)

const views = Array.from({ length: K }, () =>
  createNewNetworkView(
    models.network,
    mappedStyle,
    models.nodeTable,
    models.edgeTable,
  ),
)

if (has('render-transform: apply-style')) {
  for (let w = 0; w < 2 * K; w++) {
    do_not_optimize(
      createNewNetworkView(
        models.network,
        mappedStyle,
        models.nodeTable,
        models.edgeTable,
      ),
    )
    do_not_optimize(
      updateNetworkView(
        models.network,
        views[w & MASK],
        mappedStyle,
        models.nodeTable,
        models.edgeTable,
      ),
    )
  }

  group('render-transform: apply-style (mapping hot loop)', () => {
    summary(() => {
      bench('createNewNetworkView', () => {
        return do_not_optimize(
          createNewNetworkView(
            models.network,
            mappedStyle,
            models.nodeTable,
            models.edgeTable,
          ),
        )
      })
      bench('updateNetworkView (keep positions)', () => {
        const k = i++ & MASK

        return do_not_optimize(
          updateNetworkView(
            models.network,
            views[k],
            mappedStyle,
            models.nodeTable,
            models.edgeTable,
          ),
        )
      })
      bench('control', () => {
        const k = i++ & MASK
        let sum = 0

        for (const nv of Object.values(views[k].nodeViews)) {
          sum += nv.x + nv.y
        }

        return do_not_optimize(sum)
      })
    })
  })
}

if (has('render-transform: cyjs-map')) {
  for (let w = 0; w < 8; w++) {
    do_not_optimize(createCyjsDataMapper(mappedStyle))
  }

  group('render-transform: cyjs-map (per-property, N-independent)', () => {
    summary(() => {
      bench('createCyjsDataMapper', () => {
        return do_not_optimize(createCyjsDataMapper(mappedStyle))
      })
    })
  })
}

if (has('render-transform: cyjs-elements')) {
  const emptyCy = freshHeadlessCy()
  const populatedCy = freshHeadlessCy()
  const nodeViewList = Object.values(views[0].nodeViews)
  // network.edges is a live getter (O(E) materialization per read) — resolve
  // the operand once, outside the timed region
  const edgeList = models.network.edges

  addCyElements(populatedCy, nodeViewList, edgeList, views[0].edgeViews)

  for (let w = 0; w < 8; w++) {
    addCyElements(emptyCy, nodeViewList, edgeList, views[0].edgeViews)
    emptyCy.elements().remove()
    applyViewModel(populatedCy, views[w & MASK], EDITOR_PROPERTIES)
  }

  group('render-transform: cyjs-elements', () => {
    summary(() => {
      bench('addCyElements + remove (populate empty cy)', () => {
        addCyElements(emptyCy, nodeViewList, edgeList, views[0].edgeViews)
        emptyCy.elements().remove()
      })
      bench('applyViewModel (data() rewrite)', () => {
        const k = i++ & MASK

        applyViewModel(populatedCy, views[k], EDITOR_PROPERTIES)
      })
      bench('control', () => {
        let sum = 0

        for (const nv of nodeViewList) {
          sum += nv.x + nv.y
        }

        return do_not_optimize(sum)
      })
    })
  })
}

await finishRun('render-transform')

// a styleEnabled cytoscape instance keeps an animation timer alive, so the
// process would linger after the run (the v4 mutators suite's discovery)
process.exit(0)
