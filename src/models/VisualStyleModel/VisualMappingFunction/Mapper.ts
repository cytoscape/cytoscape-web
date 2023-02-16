import { ValueType } from '../../TableModel'
import { VisualPropertyValueType } from '../VisualPropertyValue'

/**
 * A mapper function that maps an attribute value to a visual property
 * value for the view model.
 */
export type Mapper = (
  attributeValue: ValueType,
  defaultValue: VisualPropertyValueType,
) => VisualPropertyValueType
