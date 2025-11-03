/**
 * CX2 Format Conversion Utilities
 *
 * Functions for converting CX2 format data to internal application models.
 */
import { Cx2 } from '../Cx2'
import NetworkFn, { Network, NetworkAttributes } from '../../NetworkModel'
import TableFn, { Table } from '../../TableModel'
import ViewModelFn, { NetworkView } from '../../ViewModel'
import VisualStyleFn, { VisualStyle } from '../../VisualStyleModel'
import { v4 as uuidv4 } from 'uuid'
import { createNetworkAttributesFromCx } from '../../TableModel/impl/NetworkAttributesImpl'
import { CoreAspectTag } from '../Cx2/CoreAspectTag'
import { CyNetwork } from '../../CyNetworkModel'
import { VisualStyleOptions } from '../../VisualStyleModel/VisualStyleOptions'
import { IdType } from '../../IdType'
import { OpaqueAspects } from '../../OpaqueAspectModel'

/**
 * Utility function to create a full network view from CX2
 *
 * @param cx2 - CX2 data object
 * @param id - Optional network ID (will generate UUID if not provided)
 * @returns CyNetwork object with all network data, tables, styles, and views
 */
export const createNetworkViewFromCx2 = (cx2: Cx2, id?: string): CyNetwork => {
  // Use standard UUID v4 if id is not provided
  const uuid: string = id !== undefined ? id : uuidv4()

  const network: Network = NetworkFn.createNetworkFromCx(uuid, cx2)
  const [nodeTable, edgeTable]: [Table, Table] = TableFn.createTablesFromCx(
    uuid,
    cx2,
  )
  const visualStyleOptions: VisualStyleOptions =
    VisualStyleFn.createVisualStyleOptionsFromCx(cx2)
  const visualStyle: VisualStyle = VisualStyleFn.createVisualStyleFromCx(cx2)
  const networkView: NetworkView = ViewModelFn.createViewModelFromCX(uuid, cx2)
  const networkAttributes: NetworkAttributes = createNetworkAttributesFromCx(
    uuid,
    cx2,
  )
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
    visualStyleOptions,
    networkAttributes,
    undoRedoStack,
  }
}

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
export const createCyNetworkFromCx2 = async (
  networkId: string,
  cxData: Cx2,
): Promise<CyNetwork> => {
  const network: Network = NetworkFn.createNetworkFromCx(networkId, cxData)
  const [nodeTable, edgeTable]: [Table, Table] = TableFn.createTablesFromCx(
    networkId,
    cxData,
  )
  const visualStyle: VisualStyle = VisualStyleFn.createVisualStyleFromCx(cxData)
  const networkView: NetworkView = ViewModelFn.createViewModelFromCX(
    networkId,
    cxData,
  )
  const networkAttributes: NetworkAttributes = createNetworkAttributesFromCx(
    networkId,
    cxData,
  )
  const visualStyleOptions: VisualStyleOptions =
    VisualStyleFn.createVisualStyleOptionsFromCx(cxData)
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

/**
 * Extract optional aspects from CX2
 *
 * Filters out core CX2 aspects and returns only optional/custom aspects.
 *
 * @param cx2 - CX2 data object
 * @returns Array of optional Aspects (opaque aspects)
 */
export const getOptionalAspects = (cx2: Cx2): OpaqueAspects[] => {
  const CoreAspectTagValueSet = new Set<string>(
    Object.values(CoreAspectTag) as string[],
  )
  const optionalAspects: OpaqueAspects[] = []
  for (const entry of cx2) {
    if (entry !== undefined) {
      const key = Object.keys(entry)[0]
      if (
        !CoreAspectTagValueSet.has(key) &&
        key !== 'status' &&
        key !== 'CXVersion'
      ) {
        optionalAspects.push(entry as OpaqueAspects)
      }
    }
  }
  return optionalAspects
}
