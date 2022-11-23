import { IdType } from '../IdType'
import { AttributeName } from './AttributeName'
import { ValueType } from './ValueType'
import { ValueTypeName } from './ValueTypeName'

export interface Table {
  readonly id: IdType
  readonly columns: Map<AttributeName, ValueTypeName>
  readonly aliases: Map<AttributeName, AttributeName>
  readonly rows: Map<IdType, Record<AttributeName, ValueType>>
}
