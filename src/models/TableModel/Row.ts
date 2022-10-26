import { IdType } from '../IdType'
import { AttributeName } from './AttributeName'
import { ValueType } from './ValueType'

export interface Row {
  // ID of a GraphObject associated with this row
  readonly id: IdType

  // Node / Edge attributes
  values: Record<AttributeName, ValueType>
}
