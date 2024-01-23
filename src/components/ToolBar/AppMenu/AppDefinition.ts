/**
 * There are two types of apps:
 *
 * Service: The app processed the data using a remote service
 * Client: The app processes / displays the results locally
 *
 * If the app is "Client", the app should be able to process the data by itself.
 * If the app is "Service", the app should be able to send the data to the remote service.
 *
 * The Service type apps do not need to write their own UI components. Simply reacts to the
 * return values from the remote service and update the current workspace accordingly.
 *
 */
export const AppType = {
  Service: 'service' as 'service',
  Client: 'client' as 'client',
} as const

/**
 * Actions for the return values
 *
 * The apps depend on remote services reacts to the return values
 * in the following ways:
 *
 *  - AddNetworks: Add the given networks to the current workspace
 *  - UpdateNetworks: Update the existing networks in the current workspace
 *  - AddTables: Add new tables to the current workspace
 *  - UpdateTables: Update the existing tables in the current workspace
 *  - UpdateLayouts: Update the layouts of the networks in the current workspace
 *  - UpdateSelection: Update the selection states of nodes and edges
 */
export const AppAction = {
  AddNetworks: 'addNetworks' as 'addNetworks',
  UpdateNetworks: 'updateNetworks' as 'updateNetworks',
  AddTables: 'addTables' as 'addTables',
  UpdateTables: 'updateTables' as 'updateTables',
  UpdateLayouts: 'updateLayouts' as 'updateLayouts',
  UpdateSelections: 'updateSelections' as 'updateSelections',
} as const

/**
 * The data types that the service apps process as input
 *
 * Nodes: The app processes the selected nodes as input data
 * Edges: The app processes the selected edges as input data
 * Networks: The app processes the entire network(s) as input data
 */
export const SelectedData = {
  Nodes: 'nodes' as 'nodes',
  Edges: 'edges' as 'edges',
  Networks: 'networks' as 'networks',
}

// Type definitions to enable IDE's auto-completion for the static values

export type AppType = (typeof AppType)[keyof typeof AppType]
export type AppAction = (typeof AppAction)[keyof typeof AppAction]
export type SelectedData = (typeof SelectedData)[keyof typeof SelectedData]

/**
 * The definition of an app to be registered to the main menu bar
 *
 * type: The type of the app (remote service-based or client app)
 * url: The URL of the app (Service location or the path to the client app bundle)
 * selectedData: (Optional) The data type that the app processes as input (Service apps only)
 * action: (Optional) The action that the app reacts to the return values (Service apps only)
 * rootMenu: (Optional) The name of the root menu item to which the app is registered under
 *
 */
export interface AppDefinition {
  type: AppType
  url: string
  selectedData?: SelectedData
  action?: AppAction
  rootMenu?: string
}
