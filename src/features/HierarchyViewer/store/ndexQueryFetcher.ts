import { Cx2 } from '../../../models/CxModel/Cx2'
import {
  NetworkWithView,
  createDataFromCx,
  getCachedData,
} from '../../../utils/cx-utils'
import { CachedData } from '../../../utils/CachedData'
import { getNdexClient } from '../../../utils/fetchers'
import { NetworkView } from '../../../models/ViewModel'
import { Network } from '../../../models/NetworkModel'
import { IdType } from '../../../models/IdType'

export const ndexQueryFetcher = async (
  params: string[],
): Promise<NetworkWithView> => {
  const [
    hierarchyId,
    url,
    rootNetworkUuid,
    subsystemId,
    query,
    interactionNetworkUuid,
    accessToken,
  ] = params
  if (
    hierarchyId === undefined ||
    url === undefined ||
    rootNetworkUuid === undefined ||
    subsystemId === undefined ||
    query === undefined
  ) {
    throw new Error('Missing parameters')
  }

  // Use Hierarchy ID and selected node ID as the new network ID
  const interactionNetworkId: string = `${hierarchyId}_${subsystemId}`

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
      return await fetchFromRemote(
        interactionNetworkId,
        interactionNetworkUuid,
        rootNetworkUuid,
        query,
        ndexClient,
      )
    } else {
      const isValid = isValidNetworkAndView(cache.network, cache.networkView)

      if (!isValid) {
        return await fetchFromRemote(
          interactionNetworkId,
          interactionNetworkUuid,
          rootNetworkUuid,
          query,
          ndexClient,
        )
      } else {
        return {
          network: cache.network,
          nodeTable: cache.nodeTable,
          edgeTable: cache.edgeTable,
          visualStyle: cache.visualStyle,
          networkView: cache.networkView,
        }
      }
    }
  } catch (error) {
    console.error('Failed to get network', error)
    throw error
  }
}

const fetchFromRemote = async (
  interactionNetworkId: IdType,
  interactionNetworkUuid: IdType,
  rootNetworkUuid: IdType,
  query: string,
  ndexClient: any,
): Promise<NetworkWithView> => {
  // Case 1: Simply fetch network if UUID is provided as node attribute
  if (interactionNetworkUuid !== undefined && interactionNetworkUuid !== '') {
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
}

const isEqual = (set1: Set<any>, set2: Set<any>): boolean => {
  if (set1.size !== set2.size) {
    return false
  }
  for (const item of set1) {
    if (!set2.has(item)) {
      return false
    }
  }
  return true
}

/**
 * Return true if network and network view are consistent
 *
 * @param network
 * @param networkView
 * @returns
 */
const isValidNetworkAndView = (
  network: Network,
  networkView: NetworkView,
): boolean => {
  const nodeIdSet: Set<IdType> = new Set(network.nodes.map((node) => node.id))
  const nodeViewIdSet: Set<IdType> = new Set(Object.keys(networkView.nodeViews))
  const edgeIdSet: Set<IdType> = new Set(network.edges.map((edge) => edge.id))
  const edgeViewIdSet: Set<IdType> = new Set(Object.keys(networkView.edgeViews))

  if (!isEqual(nodeIdSet, nodeViewIdSet)) {
    console.error('Network and network view are not consistent')
    return false
  }
  if (!isEqual(edgeIdSet, edgeViewIdSet)) {
    console.error('Network and network view are not consistent')
    return false
  }

  return true
}
