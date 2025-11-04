import { Cx2 } from '../models/CxModel/Cx2'
import { createCyNetworkFromCx2 } from '../models/CxModel/impl'
import { getCachedNetworkData, CachedNetworkData } from '.'
import { fetchNdexNetwork } from '../api/ndex'
import { CyNetwork } from '../models/CyNetworkModel'
import { logApi, logDb } from '../debug'
export const getModelsFromCacheOrNdex = async (
  ndexNetworkId: string,
  accessToken?: string,
): Promise<CyNetwork> => {
  try {
    // First, check the local cache
    const cache: CachedNetworkData = await getCachedNetworkData(ndexNetworkId)

    // This is necessary only when data is not in the cache
    if (
      cache.network === undefined ||
      cache.nodeTable === undefined ||
      cache.edgeTable === undefined ||
      cache.visualStyle === undefined ||
      cache.networkViews === undefined ||
      cache.visualStyleOptions === undefined ||
      cache.otherAspects === undefined ||
      cache.undoRedoStack === undefined
    ) {
      const cxData: Cx2 = await fetchNdexNetwork(ndexNetworkId, accessToken)
      return createCyNetworkFromCx2(ndexNetworkId, cxData)
    } else {
      return {
        network: cache.network,
        nodeTable: cache.nodeTable,
        edgeTable: cache.edgeTable,
        visualStyle: cache.visualStyle,
        networkViews: cache.networkViews,
        visualStyleOptions: cache.visualStyleOptions,
        otherAspects: cache.otherAspects,
        undoRedoStack: cache.undoRedoStack,
      }
    }
  } catch (error) {
    logApi.error(
      `[${getModelsFromCacheOrNdex.name}]: Failed to get network: ${error}`,
    )
    logDb.error(
      `[${getModelsFromCacheOrNdex.name}]: Failed to get network: ${error}`,
    )
    throw error
  }
}
