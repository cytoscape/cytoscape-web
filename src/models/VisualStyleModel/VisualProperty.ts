import { VisualPropertyName } from './VisualPropertyName'
import { Bypass } from './Bypass'
import { VisualMappingFunction } from './VisualMappingFunction'
import { VisualPropertyGroup } from './VisualPropertyGroup'
import { VisualPropertyValueTypeString } from './VisualPropertyValueTypeString'
// include both the visualpropertyvaluetype and the input value
export interface VisualProperty<T> {
  name: VisualPropertyName
  group: VisualPropertyGroup
  displayName: string
  type: VisualPropertyValueTypeString
  defaultValue: T
  mapping?: VisualMappingFunction
  bypassMap: Bypass<T>
}
