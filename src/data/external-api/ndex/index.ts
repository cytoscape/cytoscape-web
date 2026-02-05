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
} from './networkSummary'

// Query operations
export { fetchGeneNamesFromIds, fetchNdexInterconnectQuery } from './query'

// Workspace operations
export {
  createNdexWorkspace,
  deleteNdexWorkspace,
  fetchMyNdexAccountNetworks,
  fetchMyNdexWorkspaces,
  searchNdexNetworks,
  updateNdexWorkspace,
} from './workspace'

// Permission operations
export { getNdexNetworkPermission, hasNdexEditPermission } from './permissions'

// Errors
export {
  NdexDuplicateKeyErrorMessage,
  TimeOutErrorIndicator,
  TimeOutErrorMessage,
} from './errors'
