import { VisualPropertyValueType } from './VisualPropertyValue'
import { VisualPropertyName } from './VisualPropertyName'
import { Bypass } from './Bypass'
import { VisualMappingFunction } from './VisualMappingFunction'

// include both the visualpropertyvaluetype and the input value
export interface VisualProperty<T> {
  name: VisualPropertyName
  defaultValue: T
  mapping: VisualMappingFunction<T> | null
  bypassMap: Bypass<T>
}

export type VisualStyle = Record<
  VisualPropertyName,
  VisualProperty<VisualPropertyValueType>
>
