// src/app-api/event-bus/CyWebEvents.ts

import type { IdType } from '../../models/IdType'

/**
 * Map of all typed events dispatched by Cytoscape Web.
 * Keys are the CustomEvent type strings; values are the event detail shapes.
 */
export interface CyWebEvents {
  /** Fired when a new network is added to the workspace. */
  'network:created': { networkId: IdType }

  /** Fired when a network is removed from the workspace. */
  'network:deleted': { networkId: IdType }

  /**
   * Fired when the active (current) network changes.
   * `previousId` is an empty string if no network was active before.
   */
  'network:switched': { networkId: IdType; previousId: IdType }

  /** Fired when the selection state of the current network's view changes. */
  'selection:changed': {
    networkId: IdType
    selectedNodes: IdType[]
    selectedEdges: IdType[]
  }

  /** Fired immediately before a layout algorithm begins executing. */
  'layout:started': { networkId: IdType; algorithm: string }

  /** Fired when a layout algorithm has finished and node positions are updated. */
  'layout:completed': { networkId: IdType; algorithm: string }

  /**
   * Fired when a visual style property changes on any network.
   * `property` is the `VisualPropertyName` string (e.g., `'NODE_BACKGROUND_COLOR'`).
   */
  'style:changed': { networkId: IdType; property: string }

  /**
   * Fired when table data is written to a network's node or edge table.
   * `rowIds` is the set of node/edge IDs whose data changed in this write.
   * An empty array indicates a schema-only change (e.g., column created/deleted).
   */
  'data:changed': { networkId: IdType; tableType: 'node' | 'edge'; rowIds: IdType[] }
}

/**
 * WindowEventMap augmentation for TypeScript consumers.
 * Maps each CyWebEvents key to a typed CustomEvent so that
 * window.addEventListener overloads carry the correct detail type.
 */
export type CyWebEventMap = {
  [K in keyof CyWebEvents]: CustomEvent<CyWebEvents[K]>
}
