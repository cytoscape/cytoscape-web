import { IdType } from '../IdType'
import { AttributeName } from './AttributeName'
import { ValueType } from './ValueType'
import { ValueTypeName } from './ValueTypeName'

export interface Table {
  readonly id: IdType
  columns: Map<AttributeName, ValueTypeName>
  rows: Map<IdType, Record<AttributeName, ValueType>>
}
