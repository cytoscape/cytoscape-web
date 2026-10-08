import { CxTypeName } from '../CxModel/Cx2/CxTypeName'

/**
 * The convenience aliases a `nodeColumn` / `edgeColumn` parameter may use
 * in `columnTypeFilter`, on top of any concrete CX2 datatype. Matching is
 * done by `columnTypeMatchesFilter` in impl/index.ts.
 */
export const ColumnTypeFilter = {
  /** Any numeric column: `long`, `integer` or `double`. */
  Number: 'number',
  /** Any whole-number column: `long` or `integer`. */
  WholeNumber: 'wholenumber',
  /** Any list column. */
  List: 'list',
  /** `list_of_long`, `list_of_integer` or `list_of_double`. */
  ListOfNumber: 'list_of_number',
  /** `list_of_long` or `list_of_integer`. */
  ListOfWholeNumber: 'list_of_wholenumber',
} as const

export type ColumnTypeFilter =
  | (typeof ColumnTypeFilter)[keyof typeof ColumnTypeFilter]
  | CxTypeName
