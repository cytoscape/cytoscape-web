import { EdgeLineType } from './EdgeLineType'

export const NodeBorderLineType = {
  ...EdgeLineType,
  Double: 'double',
} as const

export type NodeBorderLineType =
  typeof NodeBorderLineType[keyof typeof NodeBorderLineType]
