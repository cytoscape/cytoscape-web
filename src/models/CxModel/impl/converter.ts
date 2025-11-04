/**
 * CX2 Format Conversion Utilities
 *
 * Functions for converting CX2 format data to internal application models.
 */
import { Cx2 } from '../Cx2'
import { Network, NetworkAttributes } from '../../NetworkModel'
import { Table } from '../../TableModel'
import { NetworkView } from '../../ViewModel'
import { VisualStyle } from '../../VisualStyleModel'
import { CyNetwork } from '../../CyNetworkModel'
import { VisualStyleOptions } from '../../VisualStyleModel/VisualStyleOptions'
import { OpaqueAspects } from '../../OpaqueAspectModel'
import { getOptionalAspects } from './extractor'
import {
  createNetworkFromCx,
  createTablesFromCx,
  createVisualStyleFromCx,
  createVisualStyleOptionsFromCx,
  createViewModelFromCX,
  createNetworkAttributesFromCx,
} from './converters'

/**
 * Create network data from CX2 format
 *
 * Converts CX2 format data into a complete CyNetwork object with all components:
 * network topology, tables, visual style, network views, network attributes,
 * visual style options, optional aspects, and undo/redo stack.
 *
 * @param networkId - Unique identifier for the network
 * @param cxData - CX2 data object
 * @returns CyNetwork object with all network data
 */
export const createCyNetworkFromCx2 = (
  networkId: string,
  cxData: Cx2,
): CyNetwork => {
  const network: Network = createNetworkFromCx(networkId, cxData)
  const [nodeTable, edgeTable]: [Table, Table] = createTablesFromCx(
    networkId,
    cxData,
  )
  const visualStyle: VisualStyle = createVisualStyleFromCx(cxData)
  const networkView: NetworkView = createViewModelFromCX(networkId, cxData)
  const networkAttributes: NetworkAttributes = createNetworkAttributesFromCx(
    networkId,
    cxData,
  )
  const visualStyleOptions: VisualStyleOptions =
    createVisualStyleOptionsFromCx(cxData)
  const otherAspects: OpaqueAspects[] = getOptionalAspects(cxData)

  const undoRedoStack = {
    undoStack: [],
    redoStack: [],
  }

  return {
    network,
    nodeTable,
    edgeTable,
    visualStyle,
    networkViews: [networkView],
    networkAttributes,
    visualStyleOptions,
    otherAspects,
    undoRedoStack,
  }
}
