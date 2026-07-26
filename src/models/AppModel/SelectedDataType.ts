/**
 * The data types that the service apps process as input
 *
 * Node: The app processes the selected nodes as input data
 * Edge: The app processes the selected edges as input data
 * Network: The app processes the entire network(s) as input data
 * None: The app does not want any data sent to it (only parameter options)
 */
export const SelectedDataType = {
  Node: 'node',
  Edge: 'edge',
  Networks: 'network',
  None: 'none',
} as const

export type SelectedDataType =
  (typeof SelectedDataType)[keyof typeof SelectedDataType]
