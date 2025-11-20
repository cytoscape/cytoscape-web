import { IdType } from '../IdType'
import { AttributeName } from './AttributeName'
import { Column } from './Column'
import { ValueType } from './ValueType'

export interface Table {
  readonly id: IdType
  readonly columns: Column[]
  readonly rows: Map<IdType, Record<AttributeName, ValueType>>
}
