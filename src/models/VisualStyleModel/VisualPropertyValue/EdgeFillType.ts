export const EdgeFillType = {
  Hollow: 'hollow',
  Filled: 'filled',
} as const

export type EdgeFillType = (typeof EdgeFillType)[keyof typeof EdgeFillType]
