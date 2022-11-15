import { IdType } from '../IdType'
import { VisualPropertyValueType } from '../VisualStyleModel'
import { VisualPropertyName } from '../VisualStyleModel/VisualPropertyName'
export interface EdgeView {
  id: IdType // ID of the associated edge
  computedVisualProperties: {
    vpName: VisualPropertyName
    vpValue: VisualPropertyValueType
  }[]
}
