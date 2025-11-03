import { Network, NetworkAttributes } from '../NetworkModel'
import { Table } from '../TableModel'
import { NetworkView } from '../ViewModel'
import { VisualStyle } from '../VisualStyleModel'
import { VisualStyleOptions } from '../VisualStyleModel/VisualStyleOptions'
import { OpaqueAspects } from '../OpaqueAspectModel'
import { UndoRedoStack } from '../StoreModel/UndoStoreModel'

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
