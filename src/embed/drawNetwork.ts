import { Collection, Core } from 'cytoscape'

import {
  createCyEdges,
  createCyNodes,
} from '@/features/NetworkPanel/CyjsRenderer/cyjsFactoryUtil'
import {
  applyViewModelTo,
  createCyjsDataMapper,
} from '@/features/NetworkPanel/CyjsRenderer/cyjsRenderUtil'
import { CyNetwork } from '@/models/CyNetworkModel'
import { IdType } from '@/models/IdType'
import { Edge } from '@/models/NetworkModel'
import { NetworkView } from '@/models/ViewModel'
import VisualStyleFn from '@/models/VisualStyleModel'
import { VisualEditorProperties } from '@/models/VisualStyleModel/VisualStyleOptions'

const DEFAULT_BACKGROUND = '#ffffff'

/**
 * Main-thread time spent adding edges before yielding a frame. The frame's
 * render comes on top. Measured on the MuSIC root (21,921 edges) with
 * WebGL: 12 ms kept frames under ~100 ms; 20 ms and 40 ms finished sooner
 * but blocked the main thread for 5 s in total.
 */
const EDGE_BUDGET_MS = 12
/** Edges added between checks of the time budget. */
const EDGE_STEP = 250

/** Used when the CX2 carries no visual editor properties. */
const DEFAULT_EDITOR_PROPERTIES: VisualEditorProperties = {
  nodeSizeLocked: false,
  arrowColorMatchesEdge: false,
  tableDisplayConfiguration: {
    nodeTable: { columnConfiguration: [] },
    edgeTable: { columnConfiguration: [] },
  },
}

export interface DrawProgress {
  edgesDrawn: number
  edgeCount: number
}

export interface NetworkDrawing {
  /** The network background colour, applied by the caller as CSS. */
  background: string
  /** Settles when every edge is drawn, or after `cancel`. */
  edgesDone: Promise<void>
  cancel: () => void
}

interface DrawOptions {
  /** Called after each batch of edges, including the last. */
  onProgress?: (progress: DrawProgress) => void
  /** Called with each batch of edges once it is added and styled. */
  onEdgesAdded?: (edges: Collection) => void
}

/**
 * Draw a network into `cy` through the full app's pipeline
 * (CyjsRenderer.tsx renderNetwork):
 * applyVisualStyle -> add elements -> applyViewModel -> createCyjsDataMapper.
 *
 * Nodes are drawn at once. Edges are drawn in batches, one batch per
 * frame, so a large network shows its nodes at once and stays responsive
 * while its edges appear. A network whose edges fit in the first batch
 * draws in one frame.
 */
export const drawNetwork = (
  cy: Core,
  cyNetwork: CyNetwork,
  { onProgress, onEdgesAdded }: DrawOptions = {},
): NetworkDrawing => {
  const { network, nodeTable, edgeTable, visualStyle, networkViews } = cyNetwork
  const view = VisualStyleFn.applyVisualStyle({
    network,
    networkView: networkViews[0],
    nodeTable,
    edgeTable,
    visualStyle,
  })
  const editorProperties =
    cyNetwork.visualStyleOptions?.visualEditorProperties ??
    DEFAULT_EDITOR_PROPERTIES

  cy.startBatch()
  cy.elements().remove()
  cy.style(createCyjsDataMapper(visualStyle) as any)
  const nodes = cy.add(createCyNodes(Object.values(view.nodeViews)))
  applyViewModelTo(nodes, view, editorProperties)
  cy.endBatch()

  let cancelled = false
  const edgeCount = network.edges.length
  const first = addEdgesWithinBudget(
    cy,
    network.edges,
    0,
    view,
    editorProperties,
  )
  let next = first.next
  onEdgesAdded?.(first.added)
  onProgress?.({ edgesDrawn: next, edgeCount })

  const edgesDone = (async () => {
    while (next < edgeCount) {
      await nextFrame()
      if (cancelled || cy.destroyed()) return
      const batch = addEdgesWithinBudget(
        cy,
        network.edges,
        next,
        view,
        editorProperties,
      )
      next = batch.next
      onEdgesAdded?.(batch.added)
      onProgress?.({ edgesDrawn: next, edgeCount })
    }
  })()

  return {
    background:
      (visualStyle.networkBackgroundColor?.defaultValue as
        | string
        | undefined) ?? DEFAULT_BACKGROUND,
    edgesDone,
    cancel: () => {
      cancelled = true
    },
  }
}

/**
 * Add edges from `from` on until the time budget runs out. Each step is its
 * own batch, so the budget includes the style update that ends it. Returns
 * the edges added and the index of the first edge not added.
 */
const addEdgesWithinBudget = (
  cy: Core,
  edges: Edge[],
  from: number,
  view: NetworkView,
  editorProperties: VisualEditorProperties,
): { added: Collection; next: number } => {
  const start = performance.now()
  const added = cy.collection()
  let next = from
  while (next < edges.length && performance.now() - start < EDGE_BUDGET_MS) {
    const step = edges.slice(next, next + EDGE_STEP)
    cy.startBatch()
    const stepEdges = cy.add(createCyEdges(step, view.edgeViews))
    applyViewModelTo(stepEdges, view, editorProperties)
    cy.endBatch()
    added.merge(stepEdges)
    next += step.length
  }
  return { added, next }
}

const nextFrame = (): Promise<void> =>
  new Promise((resolve) => requestAnimationFrame(() => resolve()))

/** Move nodes to the positions a layout engine returned. */
export const applyPositions = (
  cy: Core,
  positions: Map<IdType, [number, number]>,
): void => {
  cy.startBatch()
  positions.forEach(([x, y], nodeId) => {
    cy.getElementById(nodeId).position({ x, y })
  })
  cy.endBatch()
}
