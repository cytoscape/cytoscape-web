/**
 * NDEx Query Operations
 *
 * Functions for executing queries and fetching networks via queries.
 */
import {
  fetchNdexInterconnectQuery,
  fetchNdexNetwork,
} from '../../../data/external-api/ndex'
import { logApi } from '../../../debug'
import { Cx2 } from '../../../models/CxModel/Cx2'
import { getCyNetworkFromCx2 } from '../../../models/CxModel/impl'
import { CyNetwork } from '../../../models/CyNetworkModel'
import { IdType } from '../../../models/IdType'
import { Network } from '../../../models/NetworkModel'
import { ValueType } from '../../../models/TableModel'
import { NetworkView } from '../../../models/ViewModel'
import { HcxMetaData } from '../model/HcxMetaData'
import { SubsystemTag } from '../model/HcxMetaTag'

const MAX_RETRY_COUNT = 1

/** Subsystem downloads kept from hovering, oldest dropped first. */
const MAX_PREFETCHED = 4
/** A prefetched download older than this is fetched again on click. */
const PREFETCH_MAX_AGE_MS = 60_000

/** What fetchNdexSubnetwork downloads for one subsystem. */
export interface SubnetworkRequest {
  /** The subsystem's own interaction network, fetched by UUID when set. */
  interactionNetworkUuid: IdType
  /** Otherwise an interconnect query of `query` on this network. */
  rootNetworkUuid: IdType
  /** Comma-separated member node IDs. */
  query: string
  ndexUrl?: string
}

const prefetched = new Map<string, { cx2: Promise<Cx2>; startedAt: number }>()

const requestKey = ({
  interactionNetworkUuid,
  rootNetworkUuid,
  query,
  ndexUrl,
}: SubnetworkRequest): string =>
  interactionNetworkUuid !== undefined && interactionNetworkUuid !== ''
    ? `${ndexUrl ?? ''}|uuid|${interactionNetworkUuid}`
    : `${ndexUrl ?? ''}|query|${rootNetworkUuid}|${query}`

const downloadSubnetworkCx2 = (
  {
    interactionNetworkUuid,
    rootNetworkUuid,
    query,
    ndexUrl,
  }: SubnetworkRequest,
  accessToken?: string,
): Promise<Cx2> =>
  interactionNetworkUuid !== undefined && interactionNetworkUuid !== ''
    ? fetchNdexNetwork(interactionNetworkUuid, accessToken, ndexUrl)
    : fetchNdexInterconnectQuery(rootNetworkUuid, query, accessToken, ndexUrl)

/**
 * Start downloading a subsystem's network before it is clicked, so the
 * click (fetchNdexSubnetworkByQuery) finds the download under way or done.
 * Only the download: converting it would block the page for a network that
 * may never be opened. Does nothing when the same download is fresh.
 */
export const prefetchSubnetworkCx2 = (
  request: SubnetworkRequest,
  accessToken?: string,
): void => {
  const key = requestKey(request)
  const existing = prefetched.get(key)
  if (
    existing !== undefined &&
    Date.now() - existing.startedAt < PREFETCH_MAX_AGE_MS
  ) {
    return
  }
  const cx2 = downloadSubnetworkCx2(request, accessToken)
  // A failed prefetch is retried by the click, not reported here
  cx2.catch(() => {})
  prefetched.delete(key)
  prefetched.set(key, { cx2, startedAt: Date.now() })
  if (prefetched.size > MAX_PREFETCHED) {
    prefetched.delete(prefetched.keys().next().value as string)
  }
}

/** A fresh prefetched download of `request`, taken out of the cache. */
const takePrefetchedCx2 = (
  request: SubnetworkRequest,
): Promise<Cx2> | undefined => {
  const key = requestKey(request)
  const entry = prefetched.get(key)
  prefetched.delete(key)
  if (
    entry === undefined ||
    Date.now() - entry.startedAt >= PREFETCH_MAX_AGE_MS
  ) {
    return undefined
  }
  return entry.cx2
}

/**
 * The download that opens a subsystem, from its hierarchy node table row:
 * its own interaction network when the row names one, else an interconnect
 * query of its members on the hierarchy's interaction network. Mirrors
 * MainPanel and SubNetworkPanel. Undefined when the row gives neither.
 */
export const subsystemRequest = (
  row: Record<string, ValueType> | undefined,
  metadata: HcxMetaData | undefined,
  ndexBaseUrl: string,
): SubnetworkRequest | undefined => {
  if (row === undefined || metadata === undefined) return undefined
  const uuid = row[SubsystemTag.interactionNetworkUuid]
  const members = row[SubsystemTag.members]
  const interactionNetworkUuid = typeof uuid === 'string' ? uuid : ''
  const query = Array.isArray(members) ? members.join(',') : ''
  if (interactionNetworkUuid === '' && query === '') return undefined
  const host = metadata.interactionNetworkHost ?? ''
  return {
    interactionNetworkUuid,
    rootNetworkUuid: metadata.interactionNetworkUUID ?? '',
    query,
    ndexUrl: host === '' ? ndexBaseUrl : host,
  }
}

/** Drop every prefetched download. For tests. */
export const clearPrefetchedSubnetworks = (): void => {
  prefetched.clear()
}

/**
 * ID a hierarchy's subnetwork is stored under in the network, table and view
 * model stores.
 *
 * @param hierarchyId - ID of the hierarchy network
 * @param subsystemId - ID of the subsystem node in the hierarchy
 */
export const getSubNetworkId = (
  hierarchyId: IdType,
  subsystemId: IdType,
): IdType => `${hierarchyId}_${subsystemId}`

/**
 * Custom error class that includes information about which fetch method was used.
 */
export class NdexSubnetworkFetchError extends Error {
  readonly fetchMethod: 'uuid' | 'interconnect'

  constructor(
    message: string,
    fetchMethod: 'uuid' | 'interconnect',
    cause?: Error,
  ) {
    super(message)
    this.name = 'NdexSubnetworkFetchError'
    this.fetchMethod = fetchMethod
    this.cause = cause
  }
}

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

  try {
    const request: SubnetworkRequest = {
      interactionNetworkUuid,
      rootNetworkUuid,
      query,
      ndexUrl,
    }
    // A hover may have started this download; if it failed, download again
    const download = (): Promise<Cx2> =>
      downloadSubnetworkCx2(request, accessToken)
    const cxData: Cx2 = await (takePrefetchedCx2(request)?.catch(download) ??
      download())
    // getCyNetworkFromCx2 validates the CX2 data before processing
    return getCyNetworkFromCx2(interactionNetworkId, cxData)
  } catch (error) {
    const fetchMethod = interactionNetworkUuidExists ? 'uuid' : 'interconnect'
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    throw new NdexSubnetworkFetchError(
      `Failed to fetch network using ${fetchMethod} method: ${errorMessage}`,
      fetchMethod,
      error instanceof Error ? error : undefined,
    )
  }
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
  const interactionNetworkId: string = getSubNetworkId(hierarchyId, subsystemId)

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
        retryCount++
        if (retryCount <= MAX_RETRY_COUNT) {
          result = await fetchNdexSubnetwork(
            interactionNetworkId,
            interactionNetworkUuid,
            rootNetworkUuid,
            query,
            accessToken,
            interactionNetworkHost,
          )
          // Validate the retry result before continuing the loop
          isValidData = isValidNetworkAndViews(
            result.network,
            result.networkViews,
          )
          if (isValidData) {
            return result
          }
        }
      }
    }

    // If we still cannot get valid data, throw an error. This might be a network issue.
    throw new Error('Failed to get CX data from NDEx')
  } catch (error) {
    logApi.error(`[fetchNetworkByQuery]: Failed to get network`, error)
    throw error
  }
}
