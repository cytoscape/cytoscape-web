import { VisualProperty } from '.'
import { Cx2 } from '../../utils/cx/Cx2'
import { VisualPropertyValueType } from './VisualPropertyValue'
import { VisualStyle } from './VisualStyle'

export interface VisualStyleFn {
  createVisualStyle: () => VisualStyle
  createVisualStyleFromCx: (cx: Cx2) => VisualStyle

  nodeVisualProperties: (
    visualStyle: VisualStyle,
  ) => Array<VisualProperty<VisualPropertyValueType>>
  edgeVisualProperties: (
    visualStyle: VisualStyle,
  ) => Array<VisualProperty<VisualPropertyValueType>>
  networkVisualProperties: (
    visualStyle: VisualStyle,
  ) => Array<VisualProperty<VisualPropertyValueType>>
}
