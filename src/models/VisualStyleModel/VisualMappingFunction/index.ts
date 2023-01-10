import { MappingFunctionType } from './MappingFunctionType'
import { AttributeName } from '../../TableModel'

export interface VisualMappingFunction {
  type: MappingFunctionType
  attribute: AttributeName
}

export { DiscreteMappingFunction } from './DiscreteMappingFunction'
export { ContinuousMappingFunction } from './ContinuousMappingFunction'
export { PassthroughMappingFunction } from './PassthroughMappingFunction'
export { MappingFunctionType } from './MappingFunctionType'
