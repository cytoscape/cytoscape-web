import { VisualProperty } from './VisualProperty'
import { VisualPropertyName } from './VisualPropertyName'
import { VisualPropertyValueType } from './VisualPropertyValue'

/**
 * Visual style is a simple map from VP name to VP
 */
export type VisualStyle = Record<
  VisualPropertyName,
  VisualProperty<VisualPropertyValueType>
>
