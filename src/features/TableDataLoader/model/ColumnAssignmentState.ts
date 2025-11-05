import { ValueTypeName } from '../../../models/TableModel'
import { ColumnAssignmentType } from './ColumnAssignmentType'
import { DelimiterType } from './DelimiterType'

export interface ColumnAssignmentState {
  name: string
  meaning: ColumnAssignmentType
  dataType: ValueTypeName
  delimiter?: DelimiterType | string
  invalidValues: number[]
}
