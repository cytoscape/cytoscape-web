import { IdType } from '../IdType'
import { VisualPropertyValueType } from '../VisualStyleModel'
import { VisualPropertyName } from '../VisualStyleModel/VisualPropertyName'
export interface NodeView {
  id: IdType // ID of the associated node
  computedVisualProperties: {
    vpName: VisualPropertyName
    vpValue: VisualPropertyValueType
  }[]
}
