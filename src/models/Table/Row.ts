import { RowData } from './RowData'

export interface Row {
  readonly key: BigInt
  data: RowData
}
