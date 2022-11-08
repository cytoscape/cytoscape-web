import { Cx2 } from '../../utils/cx/Cx2'
import { VisualMappingFunction } from './VisualMappingFunction'
import { VisualPropertyName } from './VisualPropertyName'
import { VisualPropertyValueType } from './VisualPropertyValue'
import { VisualStyle, VisualProperty } from './VisualStyle'
import { Bypass } from './Bypass'

export type VisualStyleSelector = 'node' | 'edge' | 'network'

export type VisualStyleChangeSet = {
  [key in VisualPropertyName]: VisualProperty
}

export interface VisualStyleFn {
  createVisualStyle: () => VisualStyle
  createVisualStyleFromCx: (cx: Cx2) => VisualStyle

  nodeVisualProperties: (visualStyle: VisualStyle) => VisualProperty[]
  edgeVisualProperties: (visualStyle: VisualStyle) => VisualProperty[]
  networkVisualProperties: (visualStyle: VisualStyle) => VisualProperty[]

  setVisualStyle: (
    vs: VisualStyle,
    changeSet: VisualStyleChangeSet,
  ) => VisualStyle

  setMapping: (
    visualStyle: VisualStyle,
    visualPropertyName: VisualPropertyName,
    mapping: VisualMappingFunction,
  ) => VisualStyle
  setDefault: (
    visualStyle: VisualStyle,
    visualPropertyName: VisualPropertyName,
    value: VisualPropertyValueType,
  ) => VisualStyle

  setBypass: (
    visualStyle: VisualStyle,
    visualPropertyName: VisualPropertyName,
    bypass: Bypass,
  ) => VisualStyle

  getStyleValue: (
    visualStyle: VisualStyle,
    visualPropertyName: VisualPropertyName,
  ) => VisualPropertyValueType
}
