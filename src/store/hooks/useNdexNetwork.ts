import { Cx2 } from '../../models/CxModel/Cx2'
import { createDataFromCx, getCachedData } from '../../utils/cx-utils'
import { CachedData } from '../../utils/CachedData'
import { ndexNetworkFetcher } from '../../utils/fetchers'
import { NetworkWithView } from '../../models/NetworkWithViewModel'

export const useNdexNetwork = async (
  ndexNetworkId: string,
  url: string,
  accessToken?: string,
): Promise<NetworkWithView> => {
  try {
    // First, check the local cache
    const cache: CachedData = await getCachedData(ndexNetworkId)

    // This is necessary only when data is not in the cache
    if (
      cache.network === undefined ||
      cache.nodeTable === undefined ||
      cache.edgeTable === undefined ||
      cache.visualStyle === undefined ||
      cache.networkViews === undefined ||
      cache.visualStyleOptions === undefined
    ) {
      const cxData: Cx2 = await ndexNetworkFetcher(
        ndexNetworkId,
        url,
        accessToken,
      )
      return await createDataFromCx(ndexNetworkId, cxData)
    } else {
      return {
        network: cache.network,
        nodeTable: cache.nodeTable,
        edgeTable: cache.edgeTable,
        visualStyle: cache.visualStyle,
        networkViews: cache.networkViews,
        visualStyleOptions: cache.visualStyleOptions,
        otherAspects: cache.otherAspects,
      }
    }
  } catch (error) {
    console.error('Failed to get network', error)
    throw error
  }
}
