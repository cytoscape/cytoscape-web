import { AttributeName } from '../../TableModel'
import { VisualPropertyValueType } from '../VisualPropertyValue'
import { VisualPropertyValueTypeName } from '../VisualPropertyValueTypeName'
import { MappingFunctionType } from './MappingFunctionType'

export interface VisualMappingFunction {
  type: MappingFunctionType
  attribute: AttributeName
  visualPropertyType: VisualPropertyValueTypeName
  defaultValue: VisualPropertyValueType
}
