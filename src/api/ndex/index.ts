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
export { fetchNetwork } from './networks'

// Network summary operations
export {
  fetchNdexSummaries,
  getNetworkValidationStatus,
  TimeOutErrorIndicator,
  // Deprecated exports (for backward compatibility)
  fetchSummary,
  waitForNetworkValidation,
  fetchSummaryStatus,
  ndexSummaryFetcher,
} from './network-summary'

// Query operations
export { fetchNetworkByQuery, isValidNetworkAndViews } from './queries'

// Workspace operations
export {
  fetchMyWorkspaces,
  useSaveCopyToNDEx,
  useSaveNetworkToNDEx,
  useSaveWorkspace,
  TimeOutErrorMessage,
  NdexDuplicateKeyErrorMessage,
} from './workspaces'

// Status and attribute operations
export { translateMemberIds } from './status'
