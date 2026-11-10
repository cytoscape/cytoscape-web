/**
 * edgeCreationMode.ts
 *
 * State and pure decision logic for the renderer's edge creation mode, which is
 * entered from the node context menu ("Create Edge from this Node") and left by
 * clicking a node, clicking the background, pressing ESC, or when its source
 * node is deleted.
 *
 * The logic lives here rather than inline in `CyjsRenderer` so it can be unit
 * tested without a Cytoscape.js instance.
 */

import { IdType } from '@/models/IdType'

/**
 * Edge creation mode state: which node an edge is being drawn from, if any.
 */
export interface EdgeCreationModeState {
  active: boolean
  sourceNodeId: IdType | null
}

/**
 * The inactive state, used to enter and leave the mode.
 */
export const EDGE_CREATION_MODE_OFF: EdgeCreationModeState = {
  active: false,
  sourceNodeId: null,
}

/**
 * Whether edge creation mode has to end because its source node is no longer
 * in the network (deleted from a menu, by an undo, by an app): the mode would
 * otherwise wait for an edge it can no longer create. `hasNode` is only called
 * while the mode is active.
 */
export const isEdgeCreationSourceGone = (
  mode: EdgeCreationModeState,
  hasNode: (nodeId: IdType) => boolean,
): boolean =>
  mode.active && mode.sourceNodeId !== null && !hasNode(mode.sourceNodeId)

/**
 * Set to "true" on a renderer's container while its edge creation mode is
 * active, so keyboard edits made elsewhere can wait for the edge: the Delete
 * shortcut would otherwise delete the source node and leave the mode waiting
 * for an edge it can no longer create.
 */
export const EDGE_CREATION_ATTR = 'data-edge-creation'

/** Whether any renderer in the document is drawing an edge */
export const isEdgeCreationActive = (doc: Document = document): boolean =>
  doc.querySelector(`[${EDGE_CREATION_ATTR}="true"]`) !== null

/**
 * Endpoints of the edge a tap resolved to.
 */
export interface EdgeCreationEndpoints {
  sourceNodeId: IdType
  targetNodeId: IdType
}

/**
 * Decide which edge, if any, a tap should create.
 *
 * Tapping the source node itself is a valid gesture: it creates a self-loop.
 *
 * @param mode - Current edge creation mode state
 * @param targetNodeId - ID of the tapped node, or null if a non-node was tapped
 * @returns The edge endpoints to create, or null if the tap should be ignored
 */
export const resolveEdgeCreationTap = (
  mode: EdgeCreationModeState,
  targetNodeId: IdType | null,
): EdgeCreationEndpoints | null => {
  if (!mode.active || mode.sourceNodeId === null || targetNodeId === null) {
    return null
  }

  return { sourceNodeId: mode.sourceNodeId, targetNodeId }
}

/**
 * Whether a hovered node is a valid target while edge creation mode is active.
 * The source node qualifies, since tapping it creates a self-loop.
 *
 * @param mode - Current edge creation mode state
 * @param nodeId - ID of the hovered node, or null if a non-node is hovered
 */
export const isEdgeCreationTarget = (
  mode: EdgeCreationModeState,
  nodeId: IdType | null,
): boolean => resolveEdgeCreationTap(mode, nodeId) !== null
