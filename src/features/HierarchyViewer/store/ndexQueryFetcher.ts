import { Cx2 } from '../../../models/CxModel/Cx2'
import { NetworkWithView, createDataFromCx } from '../../../utils/cx-utils'
import { getNdexClient } from '../../../utils/fetchers'
import { NetworkView } from '../../../models/ViewModel'
import { Network } from '../../../models/NetworkModel'
import { IdType } from '../../../models/IdType'

const MAX_RETRY_COUNT: number = 5

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
    // always refresh the data from the server
    let result = await fetchFromRemote(
      interactionNetworkId,
      interactionNetworkUuid,
      rootNetworkUuid,
      query,
      ndexClient,
    )

    let isValidData: boolean = false
    let retryCount: number = 0
    while (!isValidData && retryCount < MAX_RETRY_COUNT) {
      isValidData = isValidNetworkAndViews(result.network, result.networkViews)
      if (isValidData) {
        return result
      } else {
        result = await fetchFromRemote(
          interactionNetworkId,
          interactionNetworkUuid,
          rootNetworkUuid,
          query,
          ndexClient,
        )
      }
      retryCount++
    }

    // If we still cannot get valid data, throw an error. This might be an network issue.
    throw new Error('Failed to get CX data from NDEx')
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

/**
 *
 * Return true if network and all of network views are consistent
 *
 * @param network
 * @param networkView
 * @returns
 */
const isValidNetworkAndViews = (
  network: Network,
  networkViews: NetworkView[],
): boolean => {
  if (networkViews === undefined || networkViews.length === 0) {
    return false
  }

  const nodeIdSet = new Set(network.nodes.map((node) => node.id))
  const edgeIdSet = new Set(network.edges.map((edge) => edge.id))

  networkViews.forEach((networkView: NetworkView) => {
    const { nodeViews, edgeViews } = networkView

    const nodeViewIdSet = new Set(Object.keys(nodeViews))
    const edgeViewIdSet = new Set(Object.keys(edgeViews))

    if (!validate(nodeIdSet, nodeViewIdSet, edgeIdSet, edgeViewIdSet)) {
      return false
    }
  })
  return true
}

const validate = (
  nodeIdSet: Set<any>,
  nodeViewIdSet: Set<any>,
  edgeIdSet: Set<any>,
  edgeViewIdSet: Set<any>,
): boolean => {
  if (
    nodeIdSet.size !== nodeViewIdSet.size ||
    edgeIdSet.size !== edgeViewIdSet.size
  ) {
    console.warn('Network and network view are not consistent')
    return false
  }

  return (
    [...nodeIdSet].every((id) => nodeViewIdSet.has(id)) &&
    [...edgeIdSet].every((id) => edgeViewIdSet.has(id))
  )
}
