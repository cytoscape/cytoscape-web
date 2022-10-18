import { IdType } from "../IdType"
import { RowData } from "./RowData"

export interface Row {
  readonly key: IdType // Node or Edge ID associated with this row
  data: RowData
}