import { ValueTypeName } from '../../../models/TableModel'
import { ColumnAppendType } from './ColumnAppendType'
import { DelimiterType } from './DelimiterType'

export interface ColumnAppendState {
  name: string
  meaning: ColumnAppendType
  dataType: ValueTypeName
  delimiter?: DelimiterType
  invalidValues: number[]
  rowsToJoin: number[]
}
