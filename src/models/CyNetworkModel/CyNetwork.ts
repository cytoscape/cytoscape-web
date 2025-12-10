import { Network } from '../NetworkModel'
import { OpaqueAspects } from '../OpaqueAspectModel'
import { UndoRedoStack } from '../StoreModel/UndoStoreModel'
import { Table } from '../TableModel'
import { NetworkView } from '../ViewModel'
import { VisualStyle } from '../VisualStyleModel'
import { VisualStyleOptions } from '../VisualStyleModel/VisualStyleOptions'
import { FilterConfig } from '../FilterModel'

/**
 * A Cytoscape Web network model that includes the visual style, table, network topology, summary, etc.
 * Represents a complete network with all its associated data and views.
 */
export interface CyNetwork {
  network: Network
  nodeTable: Table
  edgeTable: Table
  visualStyle: VisualStyle
  networkViews: NetworkView[]
  visualStyleOptions: VisualStyleOptions
  opaqueAspects: OpaqueAspects[] // All other opaque aspects found in the CX2 stream
  filterConfigs: FilterConfig[] // Filter configurations extracted from CX2 filterWidgets aspect
  undoRedoStack: UndoRedoStack
}
