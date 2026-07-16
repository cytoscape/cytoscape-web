import type { Network, NetworkAttributes } from '../NetworkModel'
import type { OpaqueAspects } from '../OpaqueAspectModel'
import type { UndoRedoStack } from '../StoreModel/UndoStoreModel'
import type { Table } from '../TableModel'
import type { NetworkView } from '../ViewModel'
import type { VisualStyle } from '../VisualStyleModel'
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
  networkViews: NetworkView[]
  visualStyleOptions?: VisualStyleOptions
  otherAspects?: OpaqueAspects[] // All other optional aspects found in the CX2 stream
  undoRedoStack: UndoRedoStack
}
