export const GraphObjectType = {
  NODE: 'node',
  EDGE: 'edge',
} as const

export type GraphObjectType =
  (typeof GraphObjectType)[keyof typeof GraphObjectType]
