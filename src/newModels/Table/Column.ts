import { IdType } from '../IdType'
import { ValueTypeName } from './ValueTypeName'

export interface Column {
  readonly id: IdType
  name?: string // (Optional) Human-readable name
  type: ValueTypeName
}
