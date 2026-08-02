import type { Network, NetworkAttributes } from '../NetworkModel'
import type { OpaqueAspects } from '../OpaqueAspectModel'
import type { UndoRedoStack } from '../StoreModel/UndoStoreModel'
import type { Table } from '../TableModel'
import type { NetworkView } from '../ViewModel'
import type { VisualStyle, VisualStyleSet } from '../VisualStyleModel'
import type { VisualStyleOptions } from '../VisualStyleModel/VisualStyleOptions'

/**
 * A Cytoscape Web network model that includes the visual style, table, network topology, summary, etc.
 * Represents a complete network with all its associated data and views.
 */
export interface CyNetwork {
  network: Network
  networkAttributes?: NetworkAttributes
  nodeTable: Table
  edgeTable: Table
  visualStyle: VisualStyle
  /**
   * All named visual styles owned by this network, including the active one.
   * `visualStyle` above always equals the active entry's content.
   * Optional for backward compatibility — producers that don't know about
   * multiple styles simply omit it and consumers fall back to a
   * single-style set built from `visualStyle`.
   */
  visualStyleSet?: VisualStyleSet
  networkViews: NetworkView[]
  visualStyleOptions?: VisualStyleOptions
  otherAspects?: OpaqueAspects[] // All other optional aspects found in the CX2 stream
  undoRedoStack: UndoRedoStack
}
