import { IdType } from '../../../models'

/**
 * Configuration for navigation actions
 * used in the URL manager to determine where to navigate
 *
 * URL in Cytoscape Web is: `/:workspaceId/networks/:networkId?[searchParams]`
 *  where :workspaceId is the base workspace ID
 *  and :networkId is the current network ID
 *
 * The searchParams are optional and can be used to pass additional
 * application state in the URL, such as selection state, UI state, etc.
 *
 * */
export interface NavigationConfig {
  workspaceId: string // Base workspace ID
  networkId?: IdType // Current network ID
  searchParams?: URLSearchParams // Optional search parameters for additional state
  replace?: boolean // Whether to replace the current history entry (default: false)
}
