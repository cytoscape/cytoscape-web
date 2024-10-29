/**
 * The data types that the service apps process as input
 *
 * Node: The app processes the selected nodes as input data
 * Edge: The app processes the selected edges as input data
 * Network: The app processes the entire network(s) as input data
 */
export const SelectedDataType = {
  Node: 'node',
  Edge: 'edge',
  Networks: 'network',
} as const

export type SelectedDataType =
  (typeof SelectedDataType)[keyof typeof SelectedDataType]
