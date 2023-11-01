import { AttributeName, ValueTypeName } from '../../TableModel'
import { VisualPropertyValueType } from '../VisualPropertyValue'
import { VisualPropertyValueTypeName } from '../VisualPropertyValueTypeName'
import { MappingFunctionType } from './MappingFunctionType'

export interface VisualMappingFunction {
  type: MappingFunctionType
  attribute: AttributeName
  attributeType: ValueTypeName
  visualPropertyType: VisualPropertyValueTypeName
  defaultValue: VisualPropertyValueType
}
