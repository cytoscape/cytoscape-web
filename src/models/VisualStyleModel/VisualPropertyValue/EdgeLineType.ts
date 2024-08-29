export const EdgeLineType = {
  Solid: 'solid',
  Dotted: 'dotted',
  Dashed: 'dashed',
} as const

export type EdgeLineType = (typeof EdgeLineType)[keyof typeof EdgeLineType]
