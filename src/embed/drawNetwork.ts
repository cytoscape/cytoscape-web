import { Collection, Core, ElementDefinition } from 'cytoscape'

import { IdType } from '@/models/IdType'

import { Drawing } from './drawing'

/**
 * Main-thread time spent adding edges before yielding a frame. The frame's
 * render comes on top. Measured on the MuSIC root (21,921 edges) with
 * WebGL: 12 ms kept frames under ~100 ms; 20 ms and 40 ms finished sooner
 * but blocked the main thread for 5 s in total.
 */
const EDGE_BUDGET_MS = 12
/** Edges added between checks of the time budget. */
const EDGE_STEP = 250

export interface DrawProgress {
  edgesDrawn: number
  edgeCount: number
}

export interface NetworkDrawing {
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
 * Draw `drawing` (from buildDrawing) into `cy`.
 *
 * Nodes are drawn at once. Edges are drawn in batches, one batch per
 * frame, so a large network shows its nodes at once and stays responsive
 * while its edges appear. A network whose edges fit in the first batch
 * draws in one frame.
 */
export const drawNetwork = (
  cy: Core,
  { nodes, edges, stylesheet }: Drawing,
  { onProgress, onEdgesAdded }: DrawOptions = {},
): NetworkDrawing => {
  cy.startBatch()
  cy.elements().remove()
  cy.style(stylesheet as any)
  cy.add(nodes)
  cy.endBatch()

  let cancelled = false
  const edgeCount = edges.length
  const first = addEdgesWithinBudget(cy, edges, 0)
  let next = first.next
  onEdgesAdded?.(first.added)
  onProgress?.({ edgesDrawn: next, edgeCount })

  const edgesDone = (async () => {
    while (next < edgeCount) {
      await nextFrame()
      if (cancelled || cy.destroyed()) return
      const batch = addEdgesWithinBudget(cy, edges, next)
      next = batch.next
      onEdgesAdded?.(batch.added)
      onProgress?.({ edgesDrawn: next, edgeCount })
    }
  })()

  return {
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
  edges: ElementDefinition[],
  from: number,
): { added: Collection; next: number } => {
  const start = performance.now()
  const added = cy.collection()
  let next = from
  while (next < edges.length && performance.now() - start < EDGE_BUDGET_MS) {
    const step = edges.slice(next, next + EDGE_STEP)
    cy.startBatch()
    const stepEdges = cy.add(step)
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
