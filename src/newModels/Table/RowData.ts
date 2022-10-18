import { IdType } from '../IdType'
import { ValueType } from './ValueType'

export interface RowData {
  [key: IdType]: ValueType
}
