import { Core, EventObject, NodeSingular } from 'cytoscape'

import { logUi } from '../../../debug'
import { IdType } from '../../../models/IdType'

/**
 * One finished drag: where each dragged node started and where it ended. A
 * node whose start is unknown is in `to` only.
 */
export interface NodeDrag {
  from: Map<IdType, [number, number]>
  to: Map<IdType, [number, number]>
}

export interface ListenForNodeDragsOptions {
  /**
   * Start position of a node whose `grab` this listener did not see, e.g.
   * because a re-render re-registered the listeners mid-drag. The view model
   * still holds it: positions are written to the store only when a drag ends.
   */
  positionBeforeDrag?: (nodeId: IdType) => [number, number] | undefined
}

/**
 * Calls `onDrag` once per drag, with every node the drag moved (#870).
 *
 * Dragging a selection makes Cytoscape.js emit `grab` and `dragfree` on each
 * selected node in turn, synchronously; handling `dragfree` directly records
 * one undo entry per node. The `dragfree` events of one drag are collected and
 * reported together in a microtask, which runs after the last of them.
 * `dragfreeon` fires once per drag but before the per-node `dragfree` events,
 * so it cannot close the batch.
 *
 * Nodes that end where they started are left out; a drag that moved none is
 * not reported.
 */
export const listenForNodeDrags = (
  cy: Core,
  onDrag: (drag: NodeDrag) => void,
  options: ListenForNodeDragsOptions = {},
): void => {
  const startPositions = new Map<IdType, [number, number]>()
  let pending: NodeDrag | undefined

  const report = (): void => {
    const drag = pending
    pending = undefined
    if (drag !== undefined) {
      onDrag(drag)
    }
  }

  cy.on('grab', 'node', (e: EventObject): void => {
    const node = e.target as NodeSingular
    const { x, y } = node.position()
    startPositions.set(node.id(), [x, y])
  })

  cy.on('dragfree', 'node', (e: EventObject): void => {
    const node = e.target as NodeSingular
    const nodeId: IdType = node.id()
    const { x, y } = node.position()

    const start =
      startPositions.get(nodeId) ?? options.positionBeforeDrag?.(nodeId)
    startPositions.delete(nodeId)
    if (start !== undefined && start[0] === x && start[1] === y) {
      return
    }

    if (pending === undefined) {
      pending = { from: new Map(), to: new Map() }
      queueMicrotask(report)
    }
    pending.to.set(nodeId, [x, y])
    if (start !== undefined) {
      pending.from.set(nodeId, start)
    } else {
      logUi.warn(
        `[listenForNodeDrags]: The start position of node ${nodeId} is unknown; undo will not move it back.`,
      )
    }
  })
}
