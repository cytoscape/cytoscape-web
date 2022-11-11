import { Cx2 } from '../../utils/cx/Cx2'
import { VisualMappingFunction } from './VisualMappingFunction'
import { VisualPropertyName } from './VisualPropertyName'
import { VisualPropertyValueType } from './VisualPropertyValue'
import { VisualStyle, VisualProperty } from './VisualStyle'
import { Bypass } from './Bypass'

export type VisualStyleSelector = 'node' | 'edge' | 'network'

export type VisualStyleChangeSet = {
  [key in VisualPropertyName]: VisualProperty<VisualPropertyValueType>
}

export interface VisualStyleFn {
  createVisualStyle: () => VisualStyle
  createVisualStyleFromCx: (cx: Cx2) => VisualStyle

  nodeVisualProperties: (
    visualStyle: VisualStyle,
  ) => VisualProperty<VisualPropertyValueType>[]
  edgeVisualProperties: (
    visualStyle: VisualStyle,
  ) => VisualProperty<VisualPropertyValueType>[]
  networkVisualProperties: (
    visualStyle: VisualStyle,
  ) => VisualProperty<VisualPropertyValueType>[]

  setVisualStyle: (
    vs: VisualStyle,
    changeSet: VisualStyleChangeSet,
  ) => VisualStyle

  setMapping: (
    visualStyle: VisualStyle,
    visualPropertyName: VisualPropertyName,
    mapping: VisualMappingFunction<VisualPropertyValueType>,
  ) => VisualStyle
  setDefault: (
    visualStyle: VisualStyle,
    visualPropertyName: VisualPropertyName,
    value: VisualPropertyValueType,
  ) => VisualStyle

  setBypass: (
    visualStyle: VisualStyle,
    visualPropertyName: VisualPropertyName,
    bypass: Bypass<VisualPropertyValueType>,
  ) => VisualStyle

  getStyleValue: (
    visualStyle: VisualStyle,
    visualPropertyName: VisualPropertyName,
  ) => VisualPropertyValueType
}
