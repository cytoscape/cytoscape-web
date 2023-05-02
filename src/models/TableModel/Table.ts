import { IdType } from '../IdType'
import { AttributeName } from './AttributeName'
import { ValueType } from './ValueType'
import { Column } from './Column'

export interface Table {
  readonly id: IdType
  readonly columns: Map<AttributeName, Column>
  readonly rows: Map<IdType, Record<AttributeName, ValueType>>
}
