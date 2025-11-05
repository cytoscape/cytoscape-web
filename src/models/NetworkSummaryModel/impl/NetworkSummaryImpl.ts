import { IdType } from '../../IdType'
import { Network } from '../../NetworkModel'
import { NetworkSummary } from '../NetworkSummary'
import { Visibility } from '../Visibility'

export interface NetworkSummaryState {
  summaries: Record<IdType, NetworkSummary>
}

/**
 * Creates a base NetworkSummary from a network and name.
 *
 * @param params - Object containing name, network, and optional description
 * @returns A new NetworkSummary with default values
 */
export const getBaseSummary = ({
  name,
  network,
  description = '',
}: {
  name: string
  network: Network
  description?: string
}): NetworkSummary => {
  const now = new Date(Date.now())
  return {
    isNdex: false,
    ownerUUID: network.id,
    isReadOnly: false,
    subnetworkIds: [],
    isValid: false,
    warnings: [],
    isShowcase: false,
    isCertified: false,
    indexLevel: '',
    hasLayout: false,
    hasSample: false,
    cxFileSize: 0,
    cx2FileSize: 0,
    properties: [],
    owner: '',
    version: '',
    completed: false,
    visibility: Visibility.PUBLIC,
    nodeCount: network.nodes.length,
    edgeCount: network.edges.length,
    description,
    creationTime: now,
    externalId: network.id,
    isDeleted: false,
    modificationTime: now,
    name,
  }
}

/**
 * Add a summary for a network
 */
export const add = (
  state: NetworkSummaryState,
  networkId: IdType,
  summary: NetworkSummary,
): NetworkSummaryState => {
  return {
    ...state,
    summaries: {
      ...state.summaries,
      [networkId]: summary,
    },
  }
}

/**
 * Add multiple summaries
 */
export const addAll = (
  state: NetworkSummaryState,
  summaries: Record<IdType, NetworkSummary>,
): NetworkSummaryState => {
  return {
    ...state,
    summaries: {
      ...state.summaries,
      ...summaries,
    },
  }
}

/**
 * Update a summary
 */
export const update = (
  state: NetworkSummaryState,
  networkId: IdType,
  summaryUpdate: Partial<NetworkSummary>,
): NetworkSummaryState => {
  const summary = state.summaries[networkId]
  if (summary === undefined) {
    return state
  }

  return {
    ...state,
    summaries: {
      ...state.summaries,
      [networkId]: {
        ...summary,
        ...summaryUpdate,
      },
    },
  }
}

/**
 * Delete a summary for a network
 */
export const deleteSummary = (
  state: NetworkSummaryState,
  networkId: IdType,
): NetworkSummaryState => {
  const { [networkId]: deleted, ...restSummaries } = state.summaries
  return {
    ...state,
    summaries: restSummaries,
  }
}

/**
 * Delete all summaries
 */
export const deleteAll = (state: NetworkSummaryState): NetworkSummaryState => {
  return {
    ...state,
    summaries: {},
  }
}
