import { AttributeName } from './AttributeName'
import { ValueTypeName } from './ValueTypeName'
import { ValueType } from './ValueType'

export interface Column {
  // Unique column name, e.g. "nodeDegree"
  readonly name: AttributeName

  // Type of the column, e.g. "long"
  readonly type: ValueTypeName

  // Some rows may not have a value associated with each column but instead provide a default value
  readonly defaultValue?: ValueType
}
