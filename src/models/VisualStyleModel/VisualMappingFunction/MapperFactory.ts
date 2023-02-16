import { ValueType } from '../../TableModel'
import { VisualPropertyValueType } from '../VisualPropertyValue'
import { ContinuousMappingFunction } from './ContinuousMappingFunction'
import { DiscreteMappingFunction } from './DiscreteMappingFunction'
import { Mapper } from './Mapper'
import { PassthroughMappingFunction } from './PassthroughMappingFunction'

/**
 * Derive the mapping function from given VMF object
 */
export const createDiscreteMapper = (dm: DiscreteMappingFunction): Mapper => {
  return (
    value: ValueType,
    defaultValue: VisualPropertyValueType,
  ): VisualPropertyValueType => {
    const vpValue = dm.vpValueMap.get(value)
    return vpValue === undefined ? defaultValue : vpValue
  }
}

export const createPassthroughMapper = (
  pm: PassthroughMappingFunction,
): Mapper => {
  return (value: ValueType): VisualPropertyValueType => {
    return (value as VisualPropertyValueType) ?? pm.defaultValue
  }
}

export const createContinuousMapper = (
  cm: ContinuousMappingFunction,
): Mapper => {
  return (value: ValueType): VisualPropertyValueType => {
    // TODO: Implement this
    return cm.defaultValue
  }
}
