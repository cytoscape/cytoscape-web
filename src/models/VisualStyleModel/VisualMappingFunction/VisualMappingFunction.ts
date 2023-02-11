import { AttributeName, ValueType } from '../../TableModel'
import { VisualPropertyValueType } from '../VisualPropertyValue'
import { MappingFunctionType } from './MappingFunctionType'

export interface VisualMappingFunction {
  type: MappingFunctionType
  attribute: AttributeName
}

export interface Transformer {
  apply: (
    attributeValue: ValueType,
    f: VisualMappingFunction,
  ) => VisualPropertyValueType
}
