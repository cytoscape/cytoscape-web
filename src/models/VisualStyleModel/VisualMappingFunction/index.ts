import { MappingFunctionType } from './MappingFunctionType'
import { VisualPropertyValueType } from '../VisualPropertyValue'
import { AttributeName } from '../../TableModel'
import { ValueType } from '../../TableModel'

export interface VisualMappingFunction {
  type: MappingFunctionType
  attribute: AttributeName
  map: (value: ValueType) => VisualPropertyValueType
}

export { DiscreteMappingFunction } from './DiscreteMappingFunction'
export { ContinuousMappingFunction } from './ContinuousMappingFunction'
export { PassthroughMappingFunction } from './PassthroughMappingFunction'
export { MappingFunctionType } from './MappingFunctionType'
