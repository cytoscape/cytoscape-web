import { CxTypeName } from '../CxModel/Cx2/CxTypeName'

export const ColumnTypeFilter = {
  Number: 'number',
  List: 'list',
} as const

export type ColumnTypeFilter =
  (typeof ColumnTypeFilter)[keyof typeof ColumnTypeFilter] & CxTypeName
