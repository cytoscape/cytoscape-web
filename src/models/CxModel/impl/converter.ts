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
import { NetworkWithView } from '../../NetworkWithViewModel'
import { VisualStyleOptions } from '../../VisualStyleModel/VisualStyleOptions'
import { IdType } from '../../IdType'
import { OpaqueAspects } from '../../OpaqueAspectModel'

interface FullNetworkData {
  network: Network
  nodeTable: Table
  edgeTable: Table
  visualStyle: VisualStyle
  networkView: NetworkView
  visualStyleOptions: VisualStyleOptions
  otherAspects: OpaqueAspects[]
}

/**
 * Utility function to create a full network view from CX2
 *
 * @param cx2 - CX2 data object
 * @param id - Optional network ID (will generate UUID if not provided)
 * @returns NetworkWithView object with all network data, tables, styles, and views
 */
export const createNetworkViewFromCx2 = (
  cx2: Cx2,
  id?: string,
): NetworkWithView => {
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
 * Create network data from CX2 format (used for NDEx networks)
 *
 * @param ndexNetworkId - Network ID from NDEx
 * @param cxData - CX2 data object
 * @returns NetworkWithView object with all network data
 */
export const createDataFromCx2 = async (
  ndexNetworkId: string,
  cxData: Cx2,
): Promise<NetworkWithView> => {
  const network: Network = NetworkFn.createNetworkFromCx(ndexNetworkId, cxData)
  const [nodeTable, edgeTable]: [Table, Table] = TableFn.createTablesFromCx(
    ndexNetworkId,
    cxData,
  )
  const visualStyle: VisualStyle = VisualStyleFn.createVisualStyleFromCx(cxData)
  const networkView: NetworkView = ViewModelFn.createViewModelFromCX(
    ndexNetworkId,
    cxData,
  )
  const networkAttributes: NetworkAttributes = createNetworkAttributesFromCx(
    ndexNetworkId,
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
 * Create a full network data object from local CX2
 *
 * @param LocalNetworkId - The unique identifier for the local network
 * @param cxData - The CX2 data object containing network details
 * @returns A full network data object including tables, styles, and aspects
 */
export const createDataFromLocalCx2 = async (
  LocalNetworkId: string,
  cxData: Cx2,
): Promise<FullNetworkData> => {
  const network: Network = NetworkFn.createNetworkFromCx(LocalNetworkId, cxData)

  const [nodeTable, edgeTable]: [Table, Table] = TableFn.createTablesFromCx(
    LocalNetworkId,
    cxData,
  )

  const visualStyle: VisualStyle = VisualStyleFn.createVisualStyleFromCx(cxData)

  const networkView: NetworkView = ViewModelFn.createViewModelFromCX(
    LocalNetworkId,
    cxData,
  )

  const visualStyleOptions: VisualStyleOptions =
    VisualStyleFn.createVisualStyleOptionsFromCx(cxData)

  const otherAspects: OpaqueAspects[] = getOptionalAspects(cxData)

  return {
    network,
    nodeTable,
    edgeTable,
    visualStyle,
    networkView,
    visualStyleOptions,
    otherAspects,
  }
}

const CoreAspectTagValueSet = new Set<string>(
  Object.values(CoreAspectTag) as string[],
)

/**
 * Extract optional aspects from CX2
 *
 * Filters out core CX2 aspects and returns only optional/custom aspects.
 *
 * @param cx2 - CX2 data object
 * @returns Array of optional Aspects (opaque aspects)
 */
export const getOptionalAspects = (cx2: Cx2): OpaqueAspects[] => {
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
