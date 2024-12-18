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

  return {
    network,
    nodeTable,
    edgeTable,
    visualStyle,
    networkViews: [networkView],
    visualStyleOptions,
    networkAttributes,
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
    const opaqueAspects: OpaqueAspectsDB|undefined = await getOpaqueAspectsFromDb(id)
    const otherAspects: OpaqueAspects[] = opaqueAspects
      ? Object.entries(opaqueAspects.aspects).map(([key, value]) => ({ [key]: value }))
      : []
    return {
      network,
      visualStyle,
      nodeTable: tables !== undefined ? tables.nodeTable : undefined,
      edgeTable: tables !== undefined ? tables.edgeTable : undefined,
      networkViews: networkViews ?? [],
      visualStyleOptions: visualStyleOptions,
      otherAspects: otherAspects,
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

  return {
    network,
    nodeTable,
    edgeTable,
    visualStyle,
    networkViews: [networkView],
    networkAttributes,
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
