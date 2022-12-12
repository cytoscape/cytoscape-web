import { Cx2 } from '../../utils/cx/Cx2'
import { VisualPropertyValueType } from './VisualPropertyValue'
import { VisualStyle } from './VisualStyle'
import { VisualProperty } from '.'

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
}
