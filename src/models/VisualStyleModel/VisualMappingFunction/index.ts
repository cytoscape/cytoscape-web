import { MappingFunctionType } from './MappingFunctionType'
import { AttributeName } from '../../TableModel'
import { ValueType } from '../../TableModel'

export interface VisualMappingFunction<T> {
  type: MappingFunctionType
  attribute: AttributeName
  map: (value: ValueType) => T
}

export { DiscreteMappingFunction } from './DiscreteMappingFunction'
export { ContinuousMappingFunction } from './ContinuousMappingFunction'
export { PassthroughMappingFunction } from './PassthroughMappingFunction'
export { MappingFunctionType } from './MappingFunctionType'
