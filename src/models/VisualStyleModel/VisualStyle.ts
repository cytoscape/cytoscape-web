import { VisualPropertyValueType } from './VisualPropertyValue'
import { VisualPropertyName } from './VisualPropertyName'
import { Bypass } from './Bypass'
import { VisualMappingFunction } from './VisualMappingFunction'

// include both the visualpropertyvaluetype and the input value
export interface VisualProperty {
  name: VisualPropertyName
  default: VisualPropertyValueType
  mapping: VisualMappingFunction | null
  bypassMap: Bypass
}

export type VisualStyle = Record<VisualPropertyName, VisualProperty>
