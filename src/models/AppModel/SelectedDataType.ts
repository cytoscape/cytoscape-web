/**
 * The data types that the service apps process as input
 *
 * Nodes: The app processes the selected nodes as input data
 * Edges: The app processes the selected edges as input data
 * Networks: The app processes the entire network(s) as input data
 */
export const SelectedDataType = {
  Nodes: 'nodes',
  Edges: 'edges',
  Networks: 'networks',
} as const

export type SelectedDataType =
  (typeof SelectedDataType)[keyof typeof SelectedDataType]
