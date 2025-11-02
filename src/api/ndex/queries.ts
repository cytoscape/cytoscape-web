/**
 * NDEx Query Operations
 *
 * Functions for executing queries and fetching networks via queries.
 */
import { Cx2 } from '../../models/CxModel/Cx2'
import { NetworkView } from '../../models/ViewModel'
import { Network } from '../../models/NetworkModel'
import { IdType } from '../../models/IdType'
import { NetworkWithView } from '../../models/NetworkWithViewModel'
import { createDataFromCx2 } from '../../models/CxModel/impl'
import { getNdexClient } from './client'
import { logApi } from '../../debug'

const MAX_RETRY_COUNT = 1

/**
 * Validates that network and network views are consistent.
 *
 * @param network - The network to validate
 * @param networkViews - Array of network views to validate
 * @returns true if network and views are consistent
 */
export const isValidNetworkAndViews = (
  network: Network,
  networkViews: NetworkView[],
): boolean => {
  if (networkViews === undefined || networkViews.length === 0) {
    return false
  }

  const nodeIdSet = new Set(network.nodes.map((node) => node.id))
  const edgeIdSet = new Set(network.edges.map((edge) => edge.id))

  for (const networkView of networkViews) {
    const { nodeViews, edgeViews } = networkView

    const nodeViewIdSet = new Set(Object.keys(nodeViews))
    const edgeViewIdSet = new Set(Object.keys(edgeViews))

    if (
      !validateViewConsistency(
        nodeIdSet,
        nodeViewIdSet,
        edgeIdSet,
        edgeViewIdSet,
      )
    ) {
      return false
    }
  }
  return true
}

/**
 * Validates view consistency between network and views.
 */
const validateViewConsistency = (
  nodeIdSet: Set<string>,
  nodeViewIdSet: Set<string>,
  edgeIdSet: Set<string>,
  edgeViewIdSet: Set<string>,
): boolean => {
  if (
    nodeIdSet.size !== nodeViewIdSet.size ||
    edgeIdSet.size !== edgeViewIdSet.size
  ) {
    logApi.warn(
      `[isValidNetworkAndViews]: Network and network view are not consistent`,
    )
    return false
  }

  return (
    [...nodeIdSet].every((id) => nodeViewIdSet.has(id)) &&
    [...edgeIdSet].every((id) => edgeViewIdSet.has(id))
  )
}

/**
 * Fetches network data from remote NDEx server.
 *
 * Can either fetch directly by UUID or execute an interconnect query.
 *
 * @param interactionNetworkId - Local network ID to use
 * @param interactionNetworkUuid - Optional NDEx UUID to fetch directly
 * @param rootNetworkUuid - Root network UUID for queries
 * @param query - Query string for interconnect queries
 * @param ndexClient - NDEx client instance
 * @returns Promise resolving to NetworkWithView
 */
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
    return await createDataFromCx2(interactionNetworkId, cx2Network)
  } else {
    // Case 2: Just run the interconnect query if UUID is not provided
    const cx2QueryResult: Cx2 = await ndexClient.interConnectQuery(
      rootNetworkUuid,
      null,
      false,
      query,
      true,
    )
    return await createDataFromCx2(interactionNetworkId, cx2QueryResult)
  }
}

/**
 * Fetches a network via NDEx query with retry logic and validation.
 *
 * Used by hierarchy viewer to fetch subnetworks via queries.
 *
 * @param params - Array containing: hierarchyId, url, rootNetworkUuid, subsystemId, query, interactionNetworkUuid, accessToken
 * @returns Promise resolving to NetworkWithView
 */
export const fetchNetworkByQuery = async (
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

    let isValidData = false
    let retryCount = 0
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

    // If we still cannot get valid data, throw an error. This might be a network issue.
    throw new Error('Failed to get CX data from NDEx')
  } catch (error) {
    logApi.error(`[fetchNetworkByQuery]: Failed to get network`, error)
    throw error
  }
}
