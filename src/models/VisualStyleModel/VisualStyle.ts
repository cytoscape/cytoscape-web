import { VisualProperty } from './VisualProperty'
import { VisualPropertyName } from './VisualPropertyName'
import { VisualPropertyValueType } from './VisualPropertyValue'

export type VisualStyle = Record<
  VisualPropertyName,
  VisualProperty<VisualPropertyValueType>
>
