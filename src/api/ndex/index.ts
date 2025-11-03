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
export { fetchNdexInterconnectQuery, fetchGeneNamesFromIds } from './query'

// Workspace operations
export {
  fetchMyNdexWorkspaces,
  fetchMyNdexAccountNetworks,
  searchNdexNetworks,
  deleteNdexWorkspace,
} from './workspace'

// Permission operations
export { getNdexNetworkPermission, hasNdexEditPermission } from './permissions'

// Errors
export {
  TimeOutErrorIndicator,
  TimeOutErrorMessage,
  NdexDuplicateKeyErrorMessage,
} from './errors'
