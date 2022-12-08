import { VisualPropertyValueType } from './VisualPropertyValue'
import { VisualPropertyName } from './VisualPropertyName'
import { Bypass } from './Bypass'
import { VisualMappingFunction } from './VisualMappingFunction'

//  this is an actual string representation of the visual property value typ
// needed by ui code to make it easier to determine what to render
export const VisualPropertyValueTypeString = {
  Color: 'color',
  NodeShape: 'nodeShape',
  EdgeLine: 'edgeLine',
  EdgeArrowShape: 'edgeArrowShape',
  Font: 'font',
  HoritzontalAlign: 'horitzontalAlign',
  VerticalAlign: 'verticalAlign',
  NodeBorderLine: 'nodeBorderLine',
  Visibility: 'visibility',
  Number: 'number',
  String: 'string',
  Boolean: 'boolean',
}

export type VisualPropertyValueTypeString =
  typeof VisualPropertyValueTypeString[keyof typeof VisualPropertyValueTypeString]

export type VisualPropertyGroup = 'node' | 'edge' | 'network'

// include both the visualpropertyvaluetype and the input value
export interface VisualProperty<T> {
  name: VisualPropertyName
  group: VisualPropertyGroup
  displayName: string
  type: VisualPropertyValueTypeString
  defaultValue: T
  mapping: VisualMappingFunction | null
  bypassMap: Bypass<T>
}

export type VisualStyle = Record<
  VisualPropertyName,
  VisualProperty<VisualPropertyValueType>
>
