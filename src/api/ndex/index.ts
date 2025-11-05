/**
 * NDEx API Module
 *
 * Centralized exports for all NDEx API operations.
 *
 * @module api/ndex
 */

// Client
export { getNdexClient } from './client'

// Network operations
export { fetchNdexNetwork, updateNdexNetwork } from './network'

// Network summary operations
export {
  fetchNdexSummaries,
  getNetworkValidationStatus,
} from './network-summary'

// Query operations
export { fetchGeneNamesFromIds,fetchNdexInterconnectQuery } from './query'

// Workspace operations
export {
  deleteNdexWorkspace,
  fetchMyNdexAccountNetworks,
  fetchMyNdexWorkspaces,
  searchNdexNetworks,
} from './workspace'

// Permission operations
export { getNdexNetworkPermission, hasNdexEditPermission } from './permissions'

// Errors
export {
  NdexDuplicateKeyErrorMessage,
  TimeOutErrorIndicator,
  TimeOutErrorMessage,
} from './errors'
