/**
 * NDEx Query Operations
 *
 * Functions for executing queries and fetching networks via queries.
 */
import { Cx2 } from '../../../models/CxModel/Cx2'
import { NetworkView } from '../../../models/ViewModel'
import { Network } from '../../../models/NetworkModel'
import { IdType } from '../../../models/IdType'
import { CyNetwork } from '../../../models/CyNetworkModel'
import { createCyNetworkFromCx2 } from '../../../models/CxModel/impl'
import {
  getNdexClient,
  fetchNdexNetwork,
  fetchNdexInterconnectQuery,
} from '../../../api/ndex'
import { logApi } from '../../../debug'

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
 * @param accessToken - Optional authentication token
 * @param ndexUrl - Optional NDEx base URL (defaults to module configuration if not provided)
 * @returns Promise resolving to CyNetwork
 */
const fetchNdexSubnetwork = async (
  interactionNetworkId: IdType,
  interactionNetworkUuid: IdType,
  rootNetworkUuid: IdType,
  query: string,
  accessToken?: string,
  ndexUrl?: string,
): Promise<CyNetwork> => {
  const interactionNetworkUuidExists =
    interactionNetworkUuid !== undefined && interactionNetworkUuid !== ''
  const result = interactionNetworkUuidExists
    ? await fetchNdexNetwork(interactionNetworkUuid, accessToken, ndexUrl)
    : await fetchNdexInterconnectQuery(
        rootNetworkUuid,
        query,
        accessToken,
        ndexUrl,
      )
  return await createCyNetworkFromCx2(interactionNetworkId, result)
}

/**
 * Fetches a network via NDEx query with retry logic and validation.
 *
 * Used by hierarchy viewer to fetch subnetworks via queries.
 *
 * @param params - Array containing: hierarchyId, rootNetworkUuid, subsystemId, query, interactionNetworkUuid, accessToken
 * @returns Promise resolving to CyNetwork
 */
export const fetchNdexSubnetworkByQuery = async (
  params: string[],
): Promise<CyNetwork> => {
  const [
    hierarchyId,
    interactionNetworkHost,
    rootNetworkUuid,
    subsystemId,
    query,
    interactionNetworkUuid,
    accessToken,
  ] = params
  if (
    hierarchyId === undefined ||
    rootNetworkUuid === undefined ||
    subsystemId === undefined ||
    query === undefined
  ) {
    throw new Error('Missing parameters')
  }

  // Use Hierarchy ID and selected node ID as the new network ID
  const interactionNetworkId: string = `${hierarchyId}_${subsystemId}`

  try {
    // always refresh the data from the server
    let result = await fetchNdexSubnetwork(
      interactionNetworkId,
      interactionNetworkUuid,
      rootNetworkUuid,
      query,
      accessToken,
      interactionNetworkHost,
    )

    let isValidData = false
    let retryCount = 0
    while (!isValidData && retryCount < MAX_RETRY_COUNT) {
      isValidData = isValidNetworkAndViews(result.network, result.networkViews)
      if (isValidData) {
        return result
      } else {
        result = await fetchNdexSubnetwork(
          interactionNetworkId,
          interactionNetworkUuid,
          rootNetworkUuid,
          query,
          accessToken,
          interactionNetworkHost,
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
