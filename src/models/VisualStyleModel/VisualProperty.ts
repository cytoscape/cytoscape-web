import { VisualPropertyName } from './VisualPropertyName'
import { Bypass } from './Bypass'
import { VisualMappingFunction } from './VisualMappingFunction'
import { VisualPropertyGroup } from './VisualPropertyGroup'
import { VisualPropertyValueTypeString } from './VisualPropertyValueTypeString'

/**
 * Visual property contains all of default value, mapping,
 * and bypass.
 */
export interface VisualProperty<T> {
  readonly name: VisualPropertyName
  readonly group: VisualPropertyGroup
  readonly displayName: string
  readonly type: VisualPropertyValueTypeString
  defaultValue: T
  mapping?: VisualMappingFunction
  bypassMap: Bypass<T>
}
