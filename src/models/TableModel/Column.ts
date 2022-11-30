import { AttributeName } from './AttributeName'
import { ValueTypeName } from './ValueTypeName'
import { ValueType } from './ValueType'

export interface Column {
  // Unique column name, e.g. "nodeDegree"
  readonly name: AttributeName

  // Type of the column, e.g. "long"
  readonly type: ValueTypeName

  // Some attributes are accessed via aliases, e.g. 'name' => 'n'
  readonly alias?: AttributeName

  // Some rows may not have a value associated with each column, provide a default value
  // if the cell doesn't have one
  readonly defaultValue: ValueType
}
