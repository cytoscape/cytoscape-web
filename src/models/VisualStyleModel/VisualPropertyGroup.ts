export const VisualPropertyGroup = {
  Node: 'node',
  Edge: 'edge',
  Network: 'network',
} as const

export type VisualPropertyGroup =
  typeof VisualPropertyGroup[keyof typeof VisualPropertyGroup]
