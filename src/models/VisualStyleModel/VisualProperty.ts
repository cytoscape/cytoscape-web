import { Bypass } from './Bypass'
import { VisualMappingFunction } from './VisualMappingFunction'
import { VisualPropertyGroup } from './VisualPropertyGroup'
import { VisualPropertyName } from './VisualPropertyName'
import { VisualPropertyValueType } from './VisualPropertyValue'
import { VisualPropertyValueTypeName } from './VisualPropertyValueTypeName'

/**
 * Visual property contains all of default value, mapping,
 * and bypass.
 */
export interface VisualProperty<T extends VisualPropertyValueType> {
  name: VisualPropertyName
  group: VisualPropertyGroup
  displayName: string
  type: VisualPropertyValueTypeName
  defaultValue: T
  mapping?: VisualMappingFunction
  bypassMap: Bypass<T>
  tooltip?: string
  maxVal?: number
}
