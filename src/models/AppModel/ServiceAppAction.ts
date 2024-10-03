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
export const ServiceAppAction = {
  AddNetworks: 'addNetworks',
  UpdateNetworks: 'updateNetworks',
  AddTables: 'addTables',
  UpdateTables: 'updateTables',
  UpdateLayouts: 'updateLayouts',
  UpdateSelections: 'updateSelections',
} as const

export type ServiceAppAction =
  (typeof ServiceAppAction)[keyof typeof ServiceAppAction]
