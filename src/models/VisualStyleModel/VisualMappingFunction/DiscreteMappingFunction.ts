import { ValueType } from '../../TableModel'

import { VisualPropertyValueType } from '../VisualPropertyValue'
import { VisualMappingFunction } from '.'

export interface DiscreteMappingFunction extends VisualMappingFunction {
  vpValueMap: Map<ValueType, VisualPropertyValueType>
}
