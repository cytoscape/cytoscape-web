import { IdType } from '../../IdType'
import { NetworkProperty } from '../NetworkProperty'
import { NetworkSummary } from '../NetworkSummary'
import { Visibility } from '../Visibility'

export interface NetworkSummaryState {
  summaries: Record<IdType, NetworkSummary>
}

/**
 * Options for creating a network summary
 */
export interface CreateNetworkSummaryOptions {
  /**
   * The network ID (UUID) for the summary (required)
   */
  networkId: IdType
  /**
   * Network name (defaults to empty string if not provided)
   */
  name?: string
  /**
   * Network description (defaults to empty string)
   */
  description?: string
  /**
   * Network version (defaults to empty string)
   */
  version?: string
  /**
   * Network properties (defaults to empty array)
   */
  properties?: NetworkProperty[]
  /**
   * Whether the network has a layout (defaults to false)
   */
  hasLayout?: boolean
  /**
   * Network visibility (defaults to Visibility.PUBLIC)
   */
  visibility?: Visibility
  /**
   * Owner UUID (defaults to network.id)
   */
  ownerUUID?: IdType
  /**
   * External ID (defaults to network.id)
   */
  externalId?: string
  /**
   * Whether the network is from NDEx (defaults to false)
   */
  isNdex?: boolean
  /**
   * Whether the network is read-only (defaults to false)
   */
  isReadOnly?: boolean
  /**
   * Subnetwork IDs (defaults to empty array)
   */
  subnetworkIds?: number[]
  /**
   * Whether the network is valid (defaults to false)
   */
  isValid?: boolean
  /**
   * Warnings array (defaults to empty array)
   */
  warnings?: string[]
  /**
   * Whether the network is a showcase (defaults to false)
   */
  isShowcase?: boolean
  /**
   * Whether the network is certified (defaults to false)
   */
  isCertified?: boolean
  /**
   * Index level (defaults to empty string)
   */
  indexLevel?: string
  /**
   * Whether the network has a sample (defaults to false)
   */
  hasSample?: boolean
  /**
   * CX file size in bytes (defaults to 0)
   */
  cxFileSize?: number
  /**
   * CX2 file size in bytes (defaults to 0)
   */
  cx2FileSize?: number
  /**
   * Network owner (defaults to empty string)
   */
  owner?: string
  /**
   * Whether the network is completed (defaults to false)
   */
  completed?: boolean
  /**
   * Whether the network is deleted (defaults to false)
   */
  isDeleted?: boolean
  /**
   * Creation time (defaults to current time)
   */
  creationTime?: Date
  /**
   * Modification time (defaults to current time)
   */
  modificationTime?: Date
}

/**
 * Creates a NetworkSummary with configurable options.
 * All parameters except networkId are optional and have sensible defaults.
 *
 * @param options - Configuration options for creating the summary
 * @returns A new NetworkSummary
 */
export const createNetworkSummary = (
  options: CreateNetworkSummaryOptions,
): NetworkSummary => {
  const {
    networkId,
    name = '',
    description = '',
    version = '',
    properties = [],
    hasLayout = false,
    visibility = Visibility.PUBLIC,
    ownerUUID = networkId,
    externalId = networkId,
    isNdex = false,
    isReadOnly = false,
    subnetworkIds = [],
    isValid = false,
    warnings = [],
    isShowcase = false,
    isCertified = false,
    indexLevel = '',
    hasSample = false,
    cxFileSize = 0,
    cx2FileSize = 0,
    owner = '',
    completed = false,
    isDeleted = false,
    creationTime = new Date(Date.now()),
    modificationTime = new Date(Date.now()),
  } = options

  return {
    isNdex,
    ownerUUID,
    isReadOnly,
    subnetworkIds,
    isValid,
    warnings,
    isShowcase,
    isCertified,
    indexLevel,
    hasLayout,
    hasSample,
    cxFileSize,
    cx2FileSize,
    properties,
    owner,
    version,
    completed,
    visibility,
    description,
    creationTime,
    externalId,
    isDeleted,
    modificationTime,
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
