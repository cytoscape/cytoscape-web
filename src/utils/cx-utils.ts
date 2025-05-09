import { Cx2 } from '../models/CxModel/Cx2'
import NetworkFn, { Network, NetworkAttributes } from '../models/NetworkModel'
import TableFn, { Table } from '../models/TableModel'
import ViewModelFn, { NetworkView } from '../models/ViewModel'
import VisualStyleFn, { VisualStyle } from '../models/VisualStyleModel'
import { v4 as uuidv4 } from 'uuid'
import {
  getNetworkFromDb,
  getTablesFromDb,
  getNetworkViewsFromDb,
  getVisualStyleFromDb,
  getUiStateFromDb,
  getOpaqueAspectsFromDb,
  OpaqueAspectsDB,
  getUndoRedoStackFromDb,
} from '../store/persist/db'
import { CachedData } from './CachedData'
import { createNetworkAttributesFromCx } from '../models/TableModel/impl/NetworkAttributesImpl'
import { Aspect } from '../models/CxModel/Cx2/Aspect'
import { CoreAspectTag } from '../models/CxModel/Cx2/CoreAspectTag'
import { NetworkWithView } from '../models/NetworkWithViewModel'
import { VisualStyleOptions } from '../models/VisualStyleModel/VisualStyleOptions'
import { Ui } from '../models/UiModel'
import { IdType } from '../models/IdType'
import { OpaqueAspects } from '../models/OpaqueAspectModel'

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
 *
 * Utility function to create a full network view from CX2
 *
 * @param cx2
 * @param id
 * @returns
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

export const getCachedData = async (id: string): Promise<CachedData> => {
  try {
    const network = await getNetworkFromDb(id)
    const tables = await getTablesFromDb(id)
    const networkViews: NetworkView[] | undefined =
      await getNetworkViewsFromDb(id)
    const visualStyle = await getVisualStyleFromDb(id)
    const uiState: Ui | undefined = await getUiStateFromDb()
    const vsOptions: Record<IdType, VisualStyleOptions> =
      uiState?.visualStyleOptions ?? {}
    // Fall back to an empty object if the visual style options are not found
    const visualStyleOptions: VisualStyleOptions = vsOptions[id] ?? {}
    const opaqueAspects: OpaqueAspectsDB | undefined =
      await getOpaqueAspectsFromDb(id)
    const otherAspects: OpaqueAspects[] = opaqueAspects
      ? Object.entries(opaqueAspects.aspects).map(([key, value]) => ({
          [key]: value,
        }))
      : []

    const undoStackDbResult = await getUndoRedoStackFromDb(id)

    const undoRedoStack = undoStackDbResult?.undoRedoStack ?? {
      undoStack: [],
      redoStack: [],
    }
    return {
      network,
      visualStyle,
      nodeTable: tables !== undefined ? tables.nodeTable : undefined,
      edgeTable: tables !== undefined ? tables.edgeTable : undefined,
      networkViews: networkViews ?? [],
      visualStyleOptions: visualStyleOptions,
      otherAspects: otherAspects,
      undoRedoStack: undoRedoStack,
    }
  } catch (e) {
    console.error('Failed to restore data from IndexedDB', e)
    throw e
  }
}

export const createDataFromCx = async (
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
const CoreAspectTagValueSet = new Set<string>(
  Object.values(CoreAspectTag) as string[],
)

/**
 * Extract optional aspects from CX2
 *
 * @param cx2
 * @returns Array of optional Aspects
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

/**
 * Validate if an aspect contains valid network attributes
 *
 * @param aspect - The aspect to validate
 * @returns True if the aspect contains valid network attributes, otherwise false
 */
const isValidNetworkAttributes = (aspect: Aspect): boolean => {
  return (
    Array.isArray(aspect.networkAttributes) &&
    aspect.networkAttributes.every(
      (attr: any) =>
        typeof attr === 'object' &&
        typeof attr.name === 'string' &&
        (attr.description === undefined ||
          typeof attr.description === 'string'),
    )
  )
}

/**
 * Validate if an aspect contains valid nodes
 *
 * @param aspect - The aspect to validate
 * @returns True if the aspect contains valid nodes, otherwise false
 */
const isValidNodes = (aspect: Aspect): boolean => {
  return (
    Array.isArray(aspect.nodes) &&
    aspect.nodes.every(
      (node: any) => typeof node === 'object' && typeof node.id === 'number',
    )
  )
}

/**
 * Validate if an aspect contains valid edges
 *
 * @param aspect - The aspect to validate
 * @returns True if the aspect contains valid edges, otherwise false
 */
const isValidEdges = (aspect: Aspect): boolean => {
  return (
    Array.isArray(aspect.edges) &&
    aspect.edges.every(
      (edge: any) =>
        typeof edge === 'object' &&
        typeof edge.id === 'number' &&
        typeof edge.s === 'number' &&
        typeof edge.t === 'number',
    )
  )
}

/**
 * Validate if an object represents a valid CX2 network
 *
 * @param obj - The object to validate, expected to be an array of aspects
 * @returns True if the object contains valid network attributes, nodes, and edges, otherwise false
 *
 * This function checks if the provided object:
 * - Contains valid network attributes
 * - Contains valid nodes
 * - Contains valid edges
 *
 * If any of these conditions are not met, the function returns false.
 */
export const isValidCx2Network = (obj: any): boolean => {
  if (!Array.isArray(obj)) {
    console.warn('Invalid Cx2Network: Expected an array of aspects', obj)
    return false
  }

  let hasValidNetworkAttributes = false
  let hasValidNodes = false
  let hasValidEdges = false

  for (const aspect of obj) {
    if (aspect.networkAttributes && isValidNetworkAttributes(aspect)) {
      hasValidNetworkAttributes = true
    } else if (aspect.nodes && isValidNodes(aspect)) {
      hasValidNodes = true
    } else if (aspect.edges && isValidEdges(aspect)) {
      hasValidEdges = true
    }
  }
  return hasValidNetworkAttributes && hasValidNodes && hasValidEdges
}
