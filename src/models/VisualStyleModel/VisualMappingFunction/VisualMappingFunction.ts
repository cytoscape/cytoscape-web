import { AttributeName } from '../../TableModel'
import { MappingFunctionType } from './MappingFunctionType'

export interface VisualMappingFunction {
  type: MappingFunctionType
  attribute: AttributeName
}
