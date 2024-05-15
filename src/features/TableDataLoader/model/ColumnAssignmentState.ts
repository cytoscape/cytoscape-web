import { ValueTypeName } from '../../../models/TableModel'
import { DelimiterType } from './DelimiterType'
import { ColumnAssignmentType } from './ColumnAssignmentType'

export interface ColumnAssignmentState {
  name: string
  meaning: ColumnAssignmentType
  dataType: ValueTypeName
  delimiter?: DelimiterType | string
  invalidValues: number[]
}
