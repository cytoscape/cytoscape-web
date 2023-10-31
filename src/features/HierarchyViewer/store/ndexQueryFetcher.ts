import { Cx2 } from '../../../models/CxModel/Cx2'
import {
  NetworkWithView,
  createDataFromCx,
  getCachedData,
} from '../../../utils/cx-utils'
import { CachedData } from '../../../utils/CachedData'
import { getNdexClient } from '../../../utils/fetchers'

export const ndexQueryFetcher = async (
  params: string[],
): Promise<NetworkWithView> => {
  const [
    url,
    rootNetworkUuid,
    subsystemId,
    query,
    interactionNetworkUuid,
    accessToken,
  ] = params
  if (
    url === undefined ||
    rootNetworkUuid === undefined ||
    subsystemId === undefined ||
    query === undefined
  ) {
    throw new Error('Missing parameters')
  }

  // Use Hierarchy ID and selected node ID as the new network ID
  const interactionNetworkId: string = `${rootNetworkUuid}_${subsystemId}`

  const ndexClient = getNdexClient(url, accessToken)

  try {
    // First, check the local cache
    const cache: CachedData = await getCachedData(interactionNetworkId)
    // const cache: CachedData = await getCachedData(subsystemId)

    // This is necessary only when data is not in the cache
    if (
      cache.network === undefined ||
      cache.nodeTable === undefined ||
      cache.edgeTable === undefined ||
      cache.visualStyle === undefined ||
      cache.networkView === undefined
    ) {
      // Case 1: Simply fetch network if UUID is provided as node attribute
      if (
        interactionNetworkUuid !== undefined &&
        interactionNetworkUuid !== ''
      ) {
        const cx2Network: Cx2 = await ndexClient.getCX2Network(
          interactionNetworkUuid,
        )
        return await createDataFromCx(interactionNetworkId, cx2Network)
      } else {
        // Case 2: Just run the interconnect query if UUID is not provided
        const cx2QueryResult: Cx2 = await ndexClient.interConnectQuery(
          rootNetworkUuid,
          null,
          false,
          query,
          true,
        )
        return await createDataFromCx(interactionNetworkId, cx2QueryResult)
      }
    } else {
      return {
        network: cache.network,
        nodeTable: cache.nodeTable,
        edgeTable: cache.edgeTable,
        visualStyle: cache.visualStyle,
        networkView: cache.networkView,
      }
    }
  } catch (error) {
    console.error('Failed to get network', error)
    throw error
  }
}
